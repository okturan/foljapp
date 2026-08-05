use crate::sources::{open_resource, Candidate, CandidateStream, ResourceSpec};
use crate::targets::TargetMatcher;
use crate::text::normalized_text;
use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::ffi::OsString;
use std::fs::{self, File};
use std::io::{BufRead, BufReader, Lines, Write};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

const CACHE_VERSION_V1: u32 = 1;
const CACHE_VERSION_V2: u32 = 2;
const NORMALIZER_VERSION: &str = "normalized_text_v1";

#[derive(Debug)]
pub struct NormalizedCandidate {
    pub normalized: String,
}

#[derive(Debug)]
pub struct AnchorRow {
    pub candidate: Candidate,
    pub normalized: String,
}

pub trait CachedCandidateSource {
    fn next_normalized(&mut self) -> Option<Result<NormalizedCandidate>>;
    fn current_candidate(&mut self) -> Result<Candidate>;
}

#[derive(Debug)]
pub struct CacheBuildStats {
    pub resource_id: String,
    pub candidates_seen: usize,
    pub empty_candidates: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct CacheMeta {
    version: u32,
    normalizer: String,
    resource_id: String,
    local_path: String,
    byte_len: u64,
    modified_unix_nanos: String,
    candidates_seen: usize,
    empty_candidates: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct CacheRow {
    doc_id: String,
    title: Option<String>,
    url: Option<String>,
    domain: Option<String>,
    genre: Option<String>,
    quality: Option<String>,
    sentence: String,
    normalized: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct CacheMetadataRow {
    doc_id: String,
    title: Option<String>,
    url: Option<String>,
    domain: Option<String>,
    genre: Option<String>,
    quality: Option<String>,
    sentence: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct AnchorRowsMeta {
    version: u32,
    normalizer: String,
    resource_id: String,
    local_path: String,
    byte_len: u64,
    modified_unix_nanos: String,
    anchor_hash: String,
    #[serde(default)]
    anchors: Vec<String>,
    anchors_count: usize,
    source_candidates_seen: usize,
    anchor_rows: usize,
}

pub type CachedCandidateStream = Box<dyn CachedCandidateSource + Send>;

pub struct AnchorRowStream {
    lines: Lines<BufReader<zstd::stream::read::Decoder<'static, BufReader<File>>>>,
    resource_id: String,
    source_candidates_seen: usize,
    anchor_rows: usize,
}

impl AnchorRowStream {
    pub fn source_candidates_seen(&self) -> usize {
        self.source_candidates_seen
    }

    pub fn anchor_rows(&self) -> usize {
        self.anchor_rows
    }
}

impl Iterator for AnchorRowStream {
    type Item = Result<AnchorRow>;

    fn next(&mut self) -> Option<Self::Item> {
        let line = match self.lines.next()? {
            Ok(line) => line,
            Err(err) => return Some(Err(err.into())),
        };
        let row = match serde_json::from_str::<CacheRow>(&line) {
            Ok(row) => row,
            Err(err) => return Some(Err(err.into())),
        };
        Some(Ok(AnchorRow {
            candidate: Candidate {
                resource_id: self.resource_id.clone(),
                doc_id: row.doc_id,
                title: row.title,
                url: row.url,
                domain: row.domain,
                genre: row.genre,
                quality: row.quality,
                sentence: row.sentence,
            },
            normalized: row.normalized,
        }))
    }
}

pub fn open_candidate_stream(
    resource: &ResourceSpec,
    cache_dir: Option<&Path>,
    require_cache: bool,
) -> Result<CachedCandidateStream> {
    if let Some(cache_dir) = cache_dir {
        match open_cached_resource(resource, cache_dir)? {
            Some(stream) => return Ok(stream),
            None if require_cache => bail!("missing or stale candidate cache for {}", resource.id),
            None => {}
        }
    }

    Ok(Box::new(RawCandidateIter {
        inner: open_resource(resource).with_context(|| format!("open source {}", resource.id))?,
        current: None,
    }))
}

pub fn build_resource_cache(
    resource: &ResourceSpec,
    cache_dir: &Path,
    refresh: bool,
    target_matcher: Option<&TargetMatcher>,
    targets_path: Option<&Path>,
) -> Result<CacheBuildStats> {
    if !refresh {
        if let Some(meta) = fresh_v2_meta(resource, cache_dir)? {
            ensure_target_hits(resource, cache_dir, target_matcher, targets_path)?;
            return Ok(CacheBuildStats {
                resource_id: resource.id.clone(),
                candidates_seen: meta.candidates_seen,
                empty_candidates: meta.empty_candidates,
            });
        }
    }

    fs::create_dir_all(cache_dir)?;
    let norm_path = norm_path(resource, cache_dir);
    let rows_path = rows_path(resource, cache_dir);
    let token_path = token_path(resource, cache_dir);
    let target_hits_path = target_hits_path(resource, cache_dir);
    let meta_path = meta_path(resource, cache_dir);
    let tmp_norm_path = tmp_path(&norm_path);
    let tmp_rows_path = tmp_path(&rows_path);
    let tmp_token_path = tmp_path(&token_path);
    let tmp_target_hits_path = tmp_path(&target_hits_path);
    let tmp_meta_path = tmp_path(&meta_path);

    let norm_file = File::create(&tmp_norm_path)
        .with_context(|| format!("create {}", tmp_norm_path.display()))?;
    let rows_file = File::create(&tmp_rows_path)
        .with_context(|| format!("create {}", tmp_rows_path.display()))?;
    let token_file = File::create(&tmp_token_path)
        .with_context(|| format!("create {}", tmp_token_path.display()))?;
    let mut norm_writer = zstd::stream::write::Encoder::new(norm_file, 3)?;
    let mut rows_writer = zstd::stream::write::Encoder::new(rows_file, 3)?;
    let mut token_writer = zstd::stream::write::Encoder::new(token_file, 3)?;
    let mut tokens = HashSet::<String>::new();
    let mut target_ids = HashSet::<String>::new();
    let mut candidates_seen = 0usize;
    let mut empty_candidates = 0usize;
    let stream = open_resource(resource).with_context(|| format!("open source {}", resource.id))?;

    for item in stream {
        let candidate = item.with_context(|| format!("read source {}", resource.id))?;
        candidates_seen += 1;
        let normalized = normalized_text(&candidate.sentence);
        if normalized.is_empty() {
            empty_candidates += 1;
        }
        for token in normalized.split_whitespace() {
            tokens.insert(token.to_owned());
        }
        if let Some(matcher) = target_matcher {
            collect_target_hits(matcher, &normalized, &mut target_ids);
        }
        let row = CacheMetadataRow {
            doc_id: candidate.doc_id,
            title: candidate.title,
            url: candidate.url,
            domain: candidate.domain,
            genre: candidate.genre,
            quality: candidate.quality,
            sentence: candidate.sentence,
        };
        norm_writer.write_all(normalized.as_bytes())?;
        norm_writer.write_all(b"\n")?;
        serde_json::to_writer(&mut rows_writer, &row)?;
        rows_writer.write_all(b"\n")?;
    }

    norm_writer.finish()?;
    rows_writer.finish()?;
    let mut sorted_tokens = tokens.into_iter().collect::<Vec<_>>();
    sorted_tokens.sort();
    for token in sorted_tokens {
        token_writer.write_all(token.as_bytes())?;
        token_writer.write_all(b"\n")?;
    }
    token_writer.finish()?;
    if target_matcher.is_some() {
        write_target_hits(&target_ids, &tmp_target_hits_path)?;
    }

    let fingerprint = fingerprint(resource)?;
    let meta = CacheMeta {
        version: CACHE_VERSION_V2,
        normalizer: NORMALIZER_VERSION.to_owned(),
        resource_id: resource.id.clone(),
        local_path: resource.local_path_text.clone(),
        byte_len: fingerprint.byte_len,
        modified_unix_nanos: fingerprint.modified_unix_nanos,
        candidates_seen,
        empty_candidates,
    };
    fs::write(&tmp_meta_path, serde_json::to_vec_pretty(&meta)?)?;
    fs::rename(tmp_norm_path, norm_path)?;
    fs::rename(tmp_rows_path, rows_path)?;
    fs::rename(tmp_token_path, token_path)?;
    if target_matcher.is_some() {
        fs::rename(tmp_target_hits_path, target_hits_path)?;
    }
    fs::rename(tmp_meta_path, meta_path)?;

    Ok(CacheBuildStats {
        resource_id: resource.id.clone(),
        candidates_seen,
        empty_candidates,
    })
}

pub fn cached_resource_may_contain_any_target_id(
    resource: &ResourceSpec,
    cache_dir: &Path,
    targets_path: &Path,
    target_ids: &HashSet<String>,
) -> Result<Option<bool>> {
    if target_ids.is_empty() {
        return Ok(Some(false));
    }
    if fresh_v2_meta(resource, cache_dir)?.is_none() {
        return Ok(None);
    }
    if !target_hits_fresh(resource, cache_dir, targets_path)? {
        return Ok(None);
    }
    let target_hits_path = target_hits_path(resource, cache_dir);
    let file = File::open(&target_hits_path)
        .with_context(|| format!("open {}", target_hits_path.display()))?;
    let lines = BufReader::new(zstd::stream::read::Decoder::new(file)?).lines();
    for line in lines {
        if target_ids.contains(&line?) {
            return Ok(Some(true));
        }
    }
    Ok(Some(false))
}

pub fn cached_candidates_seen(resource: &ResourceSpec, cache_dir: &Path) -> Result<Option<usize>> {
    Ok(fresh_v2_meta(resource, cache_dir)?.map(|meta| meta.candidates_seen))
}

pub fn cached_resource_may_contain_any_token(
    resource: &ResourceSpec,
    cache_dir: &Path,
    target_tokens: &HashSet<String>,
) -> Result<Option<bool>> {
    if target_tokens.is_empty() {
        return Ok(Some(false));
    }
    if fresh_v2_meta(resource, cache_dir)?.is_none() {
        return Ok(None);
    }
    let token_path = token_path(resource, cache_dir);
    if !token_path.exists() {
        return Ok(None);
    }
    let file = File::open(&token_path).with_context(|| format!("open {}", token_path.display()))?;
    let lines = BufReader::new(zstd::stream::read::Decoder::new(file)?).lines();
    for line in lines {
        if target_tokens.contains(&line?) {
            return Ok(Some(true));
        }
    }
    Ok(Some(false))
}

pub fn cached_resource_token_hits(
    resource: &ResourceSpec,
    cache_dir: &Path,
    target_tokens: &HashSet<String>,
) -> Result<Option<HashSet<String>>> {
    if target_tokens.is_empty() {
        return Ok(Some(HashSet::new()));
    }
    if fresh_v2_meta(resource, cache_dir)?.is_none() {
        return Ok(None);
    }
    let token_path = token_path(resource, cache_dir);
    if !token_path.exists() {
        return Ok(None);
    }
    let file = File::open(&token_path).with_context(|| format!("open {}", token_path.display()))?;
    let lines = BufReader::new(zstd::stream::read::Decoder::new(file)?).lines();
    let mut found = HashSet::new();
    for line in lines {
        let token = line?;
        if target_tokens.contains(&token) {
            found.insert(token);
            if found.len() == target_tokens.len() {
                break;
            }
        }
    }
    Ok(Some(found))
}

pub fn open_or_build_anchor_row_stream(
    resource: &ResourceSpec,
    cache_dir: &Path,
    anchors: &HashSet<String>,
    build_missing: bool,
) -> Result<Option<AnchorRowStream>> {
    if anchors.is_empty() {
        return Ok(None);
    }
    if fresh_v2_meta(resource, cache_dir)?.is_none() {
        return Ok(None);
    }
    let anchor_hash = anchor_set_hash(anchors);
    if !anchor_rows_fresh(resource, cache_dir, anchors, &anchor_hash)? {
        if !build_missing {
            return Ok(None);
        }
        build_anchor_rows(resource, cache_dir, anchors, &anchor_hash)?;
    }
    open_anchor_row_stream(resource, cache_dir, anchors, &anchor_hash)
}

fn ensure_target_hits(
    resource: &ResourceSpec,
    cache_dir: &Path,
    target_matcher: Option<&TargetMatcher>,
    targets_path: Option<&Path>,
) -> Result<()> {
    let (Some(matcher), Some(targets_path)) = (target_matcher, targets_path) else {
        return Ok(());
    };
    if target_hits_fresh(resource, cache_dir, targets_path)? {
        return Ok(());
    }
    let norm_path = norm_path(resource, cache_dir);
    let target_hits_path = target_hits_path(resource, cache_dir);
    let tmp_target_hits_path = tmp_path(&target_hits_path);
    build_target_hits_from_norm(&norm_path, &tmp_target_hits_path, matcher)?;
    fs::rename(tmp_target_hits_path, target_hits_path)?;
    Ok(())
}

fn build_anchor_rows(
    resource: &ResourceSpec,
    cache_dir: &Path,
    anchors: &HashSet<String>,
    anchor_hash: &str,
) -> Result<()> {
    let data_path = anchor_rows_path(resource, cache_dir, anchor_hash);
    let meta_path = anchor_rows_meta_path(resource, cache_dir, anchor_hash);
    let tmp_data_path = tmp_path(&data_path);
    let tmp_meta_path = tmp_path(&meta_path);
    let file = File::create(&tmp_data_path)
        .with_context(|| format!("create {}", tmp_data_path.display()))?;
    let mut writer = zstd::stream::write::Encoder::new(file, 3)?;
    let mut stream = open_candidate_stream(resource, Some(cache_dir), true)
        .with_context(|| format!("open cached candidates for {}", resource.id))?;
    let mut source_candidates_seen = 0usize;
    let mut anchor_rows = 0usize;

    while let Some(item) = stream.next_normalized() {
        let normalized = item?.normalized;
        source_candidates_seen += 1;
        if !normalized
            .split_whitespace()
            .any(|token| anchors.contains(token))
        {
            continue;
        }
        let candidate = stream.current_candidate()?;
        let row = CacheRow {
            doc_id: candidate.doc_id,
            title: candidate.title,
            url: candidate.url,
            domain: candidate.domain,
            genre: candidate.genre,
            quality: candidate.quality,
            sentence: candidate.sentence,
            normalized,
        };
        serde_json::to_writer(&mut writer, &row)?;
        writer.write_all(b"\n")?;
        anchor_rows += 1;
    }
    writer.finish()?;

    let fingerprint = fingerprint(resource)?;
    let meta = AnchorRowsMeta {
        version: CACHE_VERSION_V2,
        normalizer: NORMALIZER_VERSION.to_owned(),
        resource_id: resource.id.clone(),
        local_path: resource.local_path_text.clone(),
        byte_len: fingerprint.byte_len,
        modified_unix_nanos: fingerprint.modified_unix_nanos,
        anchor_hash: anchor_hash.to_owned(),
        anchors: sorted_anchors(anchors),
        anchors_count: anchors.len(),
        source_candidates_seen,
        anchor_rows,
    };
    fs::write(&tmp_meta_path, serde_json::to_vec_pretty(&meta)?)?;
    fs::rename(tmp_data_path, data_path)?;
    fs::rename(tmp_meta_path, meta_path)?;
    Ok(())
}

fn open_anchor_row_stream(
    resource: &ResourceSpec,
    cache_dir: &Path,
    anchors: &HashSet<String>,
    anchor_hash: &str,
) -> Result<Option<AnchorRowStream>> {
    let Some(meta) = read_fresh_anchor_rows_meta(resource, cache_dir, anchors, anchor_hash)? else {
        return Ok(None);
    };
    let data_path = anchor_rows_path(resource, cache_dir, anchor_hash);
    let file = File::open(&data_path).with_context(|| format!("open {}", data_path.display()))?;
    Ok(Some(AnchorRowStream {
        lines: BufReader::new(zstd::stream::read::Decoder::new(file)?).lines(),
        resource_id: resource.id.clone(),
        source_candidates_seen: meta.source_candidates_seen,
        anchor_rows: meta.anchor_rows,
    }))
}

fn anchor_rows_fresh(
    resource: &ResourceSpec,
    cache_dir: &Path,
    anchors: &HashSet<String>,
    anchor_hash: &str,
) -> Result<bool> {
    Ok(read_fresh_anchor_rows_meta(resource, cache_dir, anchors, anchor_hash)?.is_some())
}

fn read_fresh_anchor_rows_meta(
    resource: &ResourceSpec,
    cache_dir: &Path,
    anchors: &HashSet<String>,
    anchor_hash: &str,
) -> Result<Option<AnchorRowsMeta>> {
    let data_path = anchor_rows_path(resource, cache_dir, anchor_hash);
    let meta_path = anchor_rows_meta_path(resource, cache_dir, anchor_hash);
    if !data_path.exists() || !meta_path.exists() {
        return Ok(None);
    }
    let meta: AnchorRowsMeta = serde_json::from_slice(
        &fs::read(&meta_path).with_context(|| format!("read {}", meta_path.display()))?,
    )?;
    let fingerprint = fingerprint(resource)?;
    let sorted_anchors = sorted_anchors(anchors);
    if meta.version == CACHE_VERSION_V2
        && meta.normalizer == NORMALIZER_VERSION
        && meta.resource_id == resource.id
        && meta.local_path == resource.local_path_text
        && meta.byte_len == fingerprint.byte_len
        && meta.modified_unix_nanos == fingerprint.modified_unix_nanos
        && meta.anchor_hash == anchor_hash
        && meta.anchors_count == sorted_anchors.len()
        && meta.anchors == sorted_anchors
    {
        Ok(Some(meta))
    } else {
        Ok(None)
    }
}

fn anchor_set_hash(anchors: &HashSet<String>) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for anchor in sorted_anchors(anchors) {
        for byte in anchor.as_bytes() {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x100000001b3);
        }
        hash ^= 0xff;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

fn sorted_anchors(anchors: &HashSet<String>) -> Vec<String> {
    let mut sorted = anchors.iter().cloned().collect::<Vec<_>>();
    sorted.sort();
    sorted
}

fn build_target_hits_from_norm(
    norm_path: &Path,
    out_path: &Path,
    matcher: &TargetMatcher,
) -> Result<()> {
    let norm_file =
        File::open(norm_path).with_context(|| format!("open {}", norm_path.display()))?;
    let norm_lines = BufReader::new(zstd::stream::read::Decoder::new(norm_file)?).lines();
    let mut target_ids = HashSet::<String>::new();
    for line in norm_lines {
        collect_target_hits(matcher, &line?, &mut target_ids);
    }
    write_target_hits(&target_ids, out_path)
}

fn collect_target_hits(
    matcher: &TargetMatcher,
    normalized: &str,
    target_ids: &mut HashSet<String>,
) {
    for matched in matcher.matches_normalized(normalized) {
        target_ids.insert(matched.id.to_owned());
    }
}

fn write_target_hits(target_ids: &HashSet<String>, path: &Path) -> Result<()> {
    let file = File::create(path).with_context(|| format!("create {}", path.display()))?;
    let mut writer = zstd::stream::write::Encoder::new(file, 3)?;
    let mut sorted = target_ids.iter().collect::<Vec<_>>();
    sorted.sort();
    for target_id in sorted {
        writer.write_all(target_id.as_bytes())?;
        writer.write_all(b"\n")?;
    }
    writer.finish()?;
    Ok(())
}

fn target_hits_fresh(
    resource: &ResourceSpec,
    cache_dir: &Path,
    targets_path: &Path,
) -> Result<bool> {
    let target_hits_path = target_hits_path(resource, cache_dir);
    if !target_hits_path.exists() {
        return Ok(false);
    }
    let hits_modified = fs::metadata(target_hits_path)?.modified()?;
    let targets_modified = fs::metadata(targets_path)
        .with_context(|| format!("stat {}", targets_path.display()))?
        .modified()?;
    Ok(hits_modified >= targets_modified)
}

fn open_cached_resource(
    resource: &ResourceSpec,
    cache_dir: &Path,
) -> Result<Option<CachedCandidateStream>> {
    if fresh_v2_meta(resource, cache_dir)?.is_some() {
        let norm_path = norm_path(resource, cache_dir);
        let rows_path = rows_path(resource, cache_dir);
        let norm_file =
            File::open(&norm_path).with_context(|| format!("open {}", norm_path.display()))?;
        return Ok(Some(Box::new(CacheV2CandidateSource {
            resource_id: resource.id.clone(),
            norm_lines: BufReader::new(zstd::stream::read::Decoder::new(norm_file)?).lines(),
            rows_path,
            row_lines: None,
            current_index: None,
            next_row_index: 0,
            cached_candidate: None,
        })));
    }

    if fresh_v1_meta(resource, cache_dir)?.is_none() {
        return Ok(None);
    }

    let cache_path = v1_data_path(resource, cache_dir);
    let file = File::open(&cache_path).with_context(|| format!("open {}", cache_path.display()))?;
    let decoder = zstd::stream::read::Decoder::new(file)?;
    Ok(Some(Box::new(CacheV1CandidateSource {
        resource_id: resource.id.clone(),
        lines: BufReader::new(decoder).lines(),
        current: None,
    })))
}

fn fresh_v2_meta(resource: &ResourceSpec, cache_dir: &Path) -> Result<Option<CacheMeta>> {
    let norm_path = norm_path(resource, cache_dir);
    let rows_path = rows_path(resource, cache_dir);
    let meta_path = meta_path(resource, cache_dir);
    if !norm_path.exists() || !rows_path.exists() || !meta_path.exists() {
        return Ok(None);
    }
    let meta = read_meta(resource, cache_dir)?;
    if meta.version == CACHE_VERSION_V2 && fresh(resource, &meta)? {
        Ok(Some(meta))
    } else {
        Ok(None)
    }
}

fn fresh_v1_meta(resource: &ResourceSpec, cache_dir: &Path) -> Result<Option<CacheMeta>> {
    let cache_path = v1_data_path(resource, cache_dir);
    let meta_path = meta_path(resource, cache_dir);
    if !cache_path.exists() || !meta_path.exists() {
        return Ok(None);
    }
    let meta = read_meta(resource, cache_dir)?;
    if meta.version == CACHE_VERSION_V1 && fresh(resource, &meta)? {
        Ok(Some(meta))
    } else {
        Ok(None)
    }
}

fn read_meta(resource: &ResourceSpec, cache_dir: &Path) -> Result<CacheMeta> {
    let meta_path = meta_path(resource, cache_dir);
    Ok(serde_json::from_slice(
        &fs::read(&meta_path).with_context(|| format!("read {}", meta_path.display()))?,
    )?)
}

fn fresh(resource: &ResourceSpec, meta: &CacheMeta) -> Result<bool> {
    let fingerprint = fingerprint(resource)?;
    Ok(meta.normalizer == NORMALIZER_VERSION
        && meta.resource_id == resource.id
        && meta.local_path == resource.local_path_text
        && meta.byte_len == fingerprint.byte_len
        && meta.modified_unix_nanos == fingerprint.modified_unix_nanos)
}

struct RawCandidateIter {
    inner: CandidateStream,
    current: Option<Candidate>,
}

impl CachedCandidateSource for RawCandidateIter {
    fn next_normalized(&mut self) -> Option<Result<NormalizedCandidate>> {
        let candidate = match self.inner.next()? {
            Ok(candidate) => candidate,
            Err(err) => return Some(Err(err)),
        };
        let normalized = normalized_text(&candidate.sentence);
        self.current = Some(candidate);
        Some(Ok(NormalizedCandidate { normalized }))
    }

    fn current_candidate(&mut self) -> Result<Candidate> {
        self.current
            .clone()
            .context("candidate metadata requested before reading a candidate")
    }
}

struct CacheV1CandidateSource<R: BufRead> {
    resource_id: String,
    lines: Lines<R>,
    current: Option<Candidate>,
}

impl<R: BufRead> CachedCandidateSource for CacheV1CandidateSource<R> {
    fn next_normalized(&mut self) -> Option<Result<NormalizedCandidate>> {
        let line = match self.lines.next()? {
            Ok(line) => line,
            Err(err) => return Some(Err(err.into())),
        };
        let row = match serde_json::from_str::<CacheRow>(&line) {
            Ok(row) => row,
            Err(err) => return Some(Err(err.into())),
        };
        let normalized = row.normalized;
        self.current = Some(Candidate {
            resource_id: self.resource_id.clone(),
            doc_id: row.doc_id,
            title: row.title,
            url: row.url,
            domain: row.domain,
            genre: row.genre,
            quality: row.quality,
            sentence: row.sentence,
        });
        Some(Ok(NormalizedCandidate { normalized }))
    }

    fn current_candidate(&mut self) -> Result<Candidate> {
        self.current
            .clone()
            .context("candidate metadata requested before reading a candidate")
    }
}

struct CacheV2CandidateSource {
    resource_id: String,
    norm_lines: Lines<BufReader<zstd::stream::read::Decoder<'static, BufReader<File>>>>,
    rows_path: PathBuf,
    row_lines: Option<Lines<BufReader<zstd::stream::read::Decoder<'static, BufReader<File>>>>>,
    current_index: Option<usize>,
    next_row_index: usize,
    cached_candidate: Option<(usize, Candidate)>,
}

impl CachedCandidateSource for CacheV2CandidateSource {
    fn next_normalized(&mut self) -> Option<Result<NormalizedCandidate>> {
        let normalized = match self.norm_lines.next()? {
            Ok(line) => line,
            Err(err) => return Some(Err(err.into())),
        };
        self.current_index = Some(self.current_index.map_or(0, |index| index + 1));
        self.cached_candidate = None;
        Some(Ok(NormalizedCandidate { normalized }))
    }

    fn current_candidate(&mut self) -> Result<Candidate> {
        let index = self
            .current_index
            .context("candidate metadata requested before reading a candidate")?;
        if let Some((cached_index, candidate)) = &self.cached_candidate {
            if *cached_index == index {
                return Ok(candidate.clone());
            }
        }

        if self.row_lines.is_none() {
            let file = File::open(&self.rows_path)
                .with_context(|| format!("open {}", self.rows_path.display()))?;
            self.row_lines = Some(BufReader::new(zstd::stream::read::Decoder::new(file)?).lines());
        }
        let lines = self.row_lines.as_mut().expect("row lines");
        while self.next_row_index <= index {
            let line = match lines.next() {
                Some(Ok(line)) => line,
                Some(Err(err)) => return Err(err.into()),
                None => bail!(
                    "candidate metadata cache ended before row {} in {}",
                    index,
                    self.rows_path.display()
                ),
            };
            if self.next_row_index == index {
                let row: CacheMetadataRow = serde_json::from_str(&line)?;
                let candidate = Candidate {
                    resource_id: self.resource_id.clone(),
                    doc_id: row.doc_id,
                    title: row.title,
                    url: row.url,
                    domain: row.domain,
                    genre: row.genre,
                    quality: row.quality,
                    sentence: row.sentence,
                };
                self.cached_candidate = Some((index, candidate.clone()));
                self.next_row_index += 1;
                return Ok(candidate);
            }
            self.next_row_index += 1;
        }

        bail!("candidate metadata for row {index} was already skipped")
    }
}

fn v1_data_path(resource: &ResourceSpec, cache_dir: &Path) -> PathBuf {
    cache_dir.join(format!("{}.jsonl.zst", safe_resource_id(&resource.id)))
}

fn norm_path(resource: &ResourceSpec, cache_dir: &Path) -> PathBuf {
    cache_dir.join(format!("{}.norm.zst", safe_resource_id(&resource.id)))
}

fn rows_path(resource: &ResourceSpec, cache_dir: &Path) -> PathBuf {
    cache_dir.join(format!("{}.rows.jsonl.zst", safe_resource_id(&resource.id)))
}

fn token_path(resource: &ResourceSpec, cache_dir: &Path) -> PathBuf {
    cache_dir.join(format!("{}.tokens.zst", safe_resource_id(&resource.id)))
}

pub fn target_hits_path(resource: &ResourceSpec, cache_dir: &Path) -> PathBuf {
    cache_dir.join(format!(
        "{}.target-hits.zst",
        safe_resource_id(&resource.id)
    ))
}

fn anchor_rows_path(resource: &ResourceSpec, cache_dir: &Path, anchor_hash: &str) -> PathBuf {
    cache_dir.join(format!(
        "{}.anchor-rows-{}.jsonl.zst",
        safe_resource_id(&resource.id),
        anchor_hash
    ))
}

fn anchor_rows_meta_path(resource: &ResourceSpec, cache_dir: &Path, anchor_hash: &str) -> PathBuf {
    cache_dir.join(format!(
        "{}.anchor-rows-{}.json",
        safe_resource_id(&resource.id),
        anchor_hash
    ))
}

fn meta_path(resource: &ResourceSpec, cache_dir: &Path) -> PathBuf {
    cache_dir.join(format!("{}.json", safe_resource_id(&resource.id)))
}

fn tmp_path(path: &Path) -> PathBuf {
    let mut raw = OsString::from(path.as_os_str());
    raw.push(".tmp");
    PathBuf::from(raw)
}

fn safe_resource_id(id: &str) -> String {
    let mut safe = String::with_capacity(id.len() + 17);
    for ch in id.chars() {
        if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.') {
            safe.push(ch);
        } else {
            safe.push('_');
        }
    }
    safe.push('_');
    safe.push_str(&format!("{:016x}", hash_id(id)));
    safe
}

fn hash_id(id: &str) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in id.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

fn fingerprint(resource: &ResourceSpec) -> Result<Fingerprint> {
    let metadata = fs::metadata(&resource.local_path)
        .with_context(|| format!("stat {}", resource.local_path.display()))?;
    let modified_unix_nanos = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_nanos().to_string())
        .unwrap_or_else(|| "0".to_owned());
    Ok(Fingerprint {
        byte_len: metadata.len(),
        modified_unix_nanos,
    })
}

struct Fingerprint {
    byte_len: u64,
    modified_unix_nanos: String,
}

#[cfg(test)]
mod tests {
    use super::{
        anchor_rows_meta_path, anchor_set_hash, build_resource_cache,
        cached_resource_may_contain_any_target_id, cached_resource_may_contain_any_token,
        cached_resource_token_hits, open_or_build_anchor_row_stream, safe_resource_id,
        target_hits_path, CacheMetadataRow, CacheV2CandidateSource, CachedCandidateSource,
    };
    use crate::sources::{ResourceSpec, SourceKind};
    use crate::targets::{Target, TargetMatcher};
    use std::collections::HashSet;
    use std::fs::{self, File};
    use std::io::{BufRead, BufReader, Write};
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn safe_resource_id_keeps_partition_names_as_paths() {
        let safe = safe_resource_id("opus#zips/foo.zip");

        assert!(safe.starts_with("opus_zips_foo.zip_"));
        assert!(!safe.contains('#'));
        assert!(!safe.contains('/'));
    }

    #[test]
    fn split_cache_keeps_metadata_aligned_with_normalized_rows() {
        let dir = std::env::temp_dir().join(format!(
            "foljapp-cache-v2-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("time")
                .as_nanos()
        ));
        fs::create_dir_all(&dir).expect("create temp dir");
        let norm_path = dir.join("test.norm.zst");
        let rows_path = dir.join("test.rows.jsonl.zst");
        write_zstd_lines(&norm_path, &["alpha", "punoj ketu", "omega"]);
        write_zstd_json_rows(
            &rows_path,
            &[
                row("doc-1", "Alpha."),
                row("doc-2", "Punoj ketu."),
                row("doc-3", "Omega."),
            ],
        );

        let norm_file = File::open(&norm_path).expect("open norm");
        let mut source = CacheV2CandidateSource {
            resource_id: "test-resource".to_owned(),
            norm_lines: BufReader::new(zstd::stream::read::Decoder::new(norm_file).expect("zstd"))
                .lines(),
            rows_path: rows_path.clone(),
            row_lines: None,
            current_index: None,
            next_row_index: 0,
            cached_candidate: None,
        };

        assert_eq!(
            source
                .next_normalized()
                .expect("first")
                .expect("first ok")
                .normalized,
            "alpha"
        );
        assert_eq!(
            source
                .next_normalized()
                .expect("second")
                .expect("second ok")
                .normalized,
            "punoj ketu"
        );
        assert_eq!(
            source.current_candidate().expect("candidate").doc_id,
            "doc-2"
        );
        assert_eq!(
            source
                .current_candidate()
                .expect("cached candidate")
                .sentence,
            "Punoj ketu."
        );
        assert_eq!(
            source
                .next_normalized()
                .expect("third")
                .expect("third ok")
                .normalized,
            "omega"
        );
        assert_eq!(
            source.current_candidate().expect("third candidate").doc_id,
            "doc-3"
        );

        fs::remove_dir_all(dir).expect("remove temp dir");
    }

    #[test]
    fn split_cache_token_inventory_supports_exact_negative_checks() {
        let dir = std::env::temp_dir().join(format!(
            "foljapp-cache-token-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("time")
                .as_nanos()
        ));
        let source_path = dir.join("source.txt");
        let cache_dir = dir.join("cache");
        fs::create_dir_all(&dir).expect("create temp dir");
        fs::write(&source_path, "Punoj këtu.\nOmega.\n").expect("write source");
        let resource = ResourceSpec {
            id: "test-source".to_owned(),
            title: "Test Source".to_owned(),
            resource_kind: "test".to_owned(),
            source_url: None,
            local_path_text: source_path.to_string_lossy().into_owned(),
            local_path: source_path,
            format: Some("txt".to_owned()),
            license: None,
            kind: SourceKind::SeeUniversityTxtLines,
        };

        build_resource_cache(&resource, &cache_dir, true, None, None).expect("build cache");

        assert_eq!(
            cached_resource_may_contain_any_token(
                &resource,
                &cache_dir,
                &HashSet::from(["punoj".to_owned()])
            )
            .expect("read token inventory"),
            Some(true)
        );
        assert_eq!(
            cached_resource_may_contain_any_token(
                &resource,
                &cache_dir,
                &HashSet::from(["mungon".to_owned()])
            )
            .expect("read token inventory"),
            Some(false)
        );
        assert_eq!(
            cached_resource_token_hits(
                &resource,
                &cache_dir,
                &HashSet::from(["punoj".to_owned(), "omega".to_owned(), "mungon".to_owned()])
            )
            .expect("read token hits"),
            Some(HashSet::from(["punoj".to_owned(), "omega".to_owned()]))
        );
        assert!(open_or_build_anchor_row_stream(
            &resource,
            &cache_dir,
            &HashSet::from(["punoj".to_owned()]),
            false,
        )
        .expect("open-only anchor rows")
        .is_none());

        let anchors = HashSet::from(["punoj".to_owned()]);
        let anchor_rows = open_or_build_anchor_row_stream(&resource, &cache_dir, &anchors, true)
            .expect("open anchor rows")
            .expect("anchor stream")
            .collect::<Result<Vec<_>, _>>()
            .expect("collect anchor rows");
        assert_eq!(anchor_rows.len(), 1);
        assert_eq!(anchor_rows[0].normalized, "punoj këtu");
        assert_eq!(anchor_rows[0].candidate.sentence, "Punoj këtu.");

        let meta_path = anchor_rows_meta_path(&resource, &cache_dir, &anchor_set_hash(&anchors));
        let meta: serde_json::Value =
            serde_json::from_slice(&fs::read(&meta_path).expect("read anchor meta"))
                .expect("parse anchor meta");
        assert_eq!(meta["anchors"], serde_json::json!(["punoj"]));

        let mut legacy_meta = meta.clone();
        legacy_meta
            .as_object_mut()
            .expect("legacy meta object")
            .remove("anchors");
        fs::write(
            &meta_path,
            serde_json::to_vec_pretty(&legacy_meta).expect("legacy meta json"),
        )
        .expect("write legacy anchor meta");
        assert!(
            open_or_build_anchor_row_stream(&resource, &cache_dir, &anchors, false)
                .expect("open legacy anchor rows")
                .is_none()
        );

        fs::remove_dir_all(dir).expect("remove temp dir");
    }

    #[test]
    fn split_cache_target_inventory_skips_impossible_targets() {
        let dir = std::env::temp_dir().join(format!(
            "foljapp-cache-target-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("time")
                .as_nanos()
        ));
        let source_path = dir.join("source.txt");
        let targets_path = dir.join("targets.json");
        let cache_dir = dir.join("cache");
        fs::create_dir_all(&dir).expect("create temp dir");
        fs::write(&targets_path, "{}").expect("write targets marker");
        fs::write(
            &source_path,
            "Punoj këtu.\nDua të punoj nesër.\nMos të shkoj vonë.\n",
        )
        .expect("write source");
        let resource = ResourceSpec {
            id: "test-source".to_owned(),
            title: "Test Source".to_owned(),
            resource_kind: "test".to_owned(),
            source_url: None,
            local_path_text: source_path.to_string_lossy().into_owned(),
            local_path: source_path,
            format: Some("txt".to_owned()),
            license: None,
            kind: SourceKind::SeeUniversityTxtLines,
        };
        let matcher = TargetMatcher::new(vec![
            target("target-punoj", "punoj", &["punoj"]),
            target("target-te-punoj", "të punoj", &["të", "punoj"]),
            target(
                "target-mos-te-punoj",
                "mos të punoj",
                &["mos", "të", "punoj"],
            ),
        ])
        .expect("matcher");

        build_resource_cache(
            &resource,
            &cache_dir,
            true,
            Some(&matcher),
            Some(&targets_path),
        )
        .expect("build cache");

        assert_eq!(
            cached_resource_may_contain_any_target_id(
                &resource,
                &cache_dir,
                &targets_path,
                &HashSet::from(["target-te-punoj".to_owned()]),
            )
            .expect("read target inventory"),
            Some(true)
        );
        assert_eq!(
            cached_resource_may_contain_any_target_id(
                &resource,
                &cache_dir,
                &targets_path,
                &HashSet::from(["target-mos-te-punoj".to_owned()]),
            )
            .expect("read target inventory"),
            Some(false)
        );

        fs::remove_file(target_hits_path(&resource, &cache_dir)).expect("remove target sidecar");
        assert_eq!(
            cached_resource_may_contain_any_target_id(
                &resource,
                &cache_dir,
                &targets_path,
                &HashSet::from(["target-te-punoj".to_owned()]),
            )
            .expect("missing target inventory"),
            None
        );
        build_resource_cache(
            &resource,
            &cache_dir,
            false,
            Some(&matcher),
            Some(&targets_path),
        )
        .expect("backfill sidecar");
        assert!(target_hits_path(&resource, &cache_dir).exists());

        fs::remove_dir_all(dir).expect("remove temp dir");
    }

    fn target(id: &str, target_key: &str, tokens: &[&str]) -> Target {
        Target {
            id: id.to_owned(),
            target_key: target_key.to_owned(),
            display_form: target_key.to_owned(),
            tokens: tokens.iter().map(|token| (*token).to_owned()).collect(),
            signature: "test".to_owned(),
            anc_tags: Vec::new(),
            anc_query: String::new(),
            cell_label: String::new(),
            verb_id: "punoj".to_owned(),
            lemma: "punoj".to_owned(),
            translation_en: "to work".to_owned(),
            options_json: "{}".to_owned(),
        }
    }

    fn row(doc_id: &str, sentence: &str) -> CacheMetadataRow {
        CacheMetadataRow {
            doc_id: doc_id.to_owned(),
            title: None,
            url: None,
            domain: None,
            genre: None,
            quality: None,
            sentence: sentence.to_owned(),
        }
    }

    fn write_zstd_lines(path: &std::path::Path, lines: &[&str]) {
        let file = File::create(path).expect("create zstd lines");
        let mut writer = zstd::stream::write::Encoder::new(file, 3).expect("zstd writer");
        for line in lines {
            writer.write_all(line.as_bytes()).expect("write line");
            writer.write_all(b"\n").expect("write newline");
        }
        writer.finish().expect("finish zstd lines");
    }

    fn write_zstd_json_rows(path: &std::path::Path, rows: &[CacheMetadataRow]) {
        let file = File::create(path).expect("create zstd rows");
        let mut writer = zstd::stream::write::Encoder::new(file, 3).expect("zstd writer");
        for row in rows {
            serde_json::to_writer(&mut writer, row).expect("write row");
            writer.write_all(b"\n").expect("write newline");
        }
        writer.finish().expect("finish zstd rows");
    }
}
