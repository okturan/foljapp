use crate::sources::{open_resource, Candidate, CandidateStream, ResourceSpec};
use crate::text::normalized_text;
use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use std::ffi::OsString;
use std::fs::{self, File};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

const CACHE_VERSION: u32 = 1;
const NORMALIZER_VERSION: &str = "normalized_text_v1";

#[derive(Debug)]
pub struct CachedCandidate {
    pub candidate: Candidate,
    pub normalized: String,
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

pub type CachedCandidateStream = Box<dyn Iterator<Item = Result<CachedCandidate>> + Send>;

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
    }))
}

pub fn build_resource_cache(
    resource: &ResourceSpec,
    cache_dir: &Path,
    refresh: bool,
) -> Result<CacheBuildStats> {
    if !refresh {
        if let Some(meta) = fresh_meta(resource, cache_dir)? {
            return Ok(CacheBuildStats {
                resource_id: resource.id.clone(),
                candidates_seen: meta.candidates_seen,
                empty_candidates: meta.empty_candidates,
            });
        }
    }

    fs::create_dir_all(cache_dir)?;
    let cache_path = data_path(resource, cache_dir);
    let meta_path = meta_path(resource, cache_dir);
    let tmp_cache_path = tmp_path(&cache_path);
    let tmp_meta_path = tmp_path(&meta_path);

    let file = File::create(&tmp_cache_path)
        .with_context(|| format!("create {}", tmp_cache_path.display()))?;
    let mut writer = zstd::stream::write::Encoder::new(file, 3)?;
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
    }

    writer.finish()?;

    let fingerprint = fingerprint(resource)?;
    let meta = CacheMeta {
        version: CACHE_VERSION,
        normalizer: NORMALIZER_VERSION.to_owned(),
        resource_id: resource.id.clone(),
        local_path: resource.local_path_text.clone(),
        byte_len: fingerprint.byte_len,
        modified_unix_nanos: fingerprint.modified_unix_nanos,
        candidates_seen,
        empty_candidates,
    };
    fs::write(&tmp_meta_path, serde_json::to_vec_pretty(&meta)?)?;
    fs::rename(tmp_cache_path, cache_path)?;
    fs::rename(tmp_meta_path, meta_path)?;

    Ok(CacheBuildStats {
        resource_id: resource.id.clone(),
        candidates_seen,
        empty_candidates,
    })
}

fn open_cached_resource(
    resource: &ResourceSpec,
    cache_dir: &Path,
) -> Result<Option<CachedCandidateStream>> {
    if fresh_meta(resource, cache_dir)?.is_none() {
        return Ok(None);
    }

    let cache_path = data_path(resource, cache_dir);
    let file = File::open(&cache_path).with_context(|| format!("open {}", cache_path.display()))?;
    let decoder = zstd::stream::read::Decoder::new(file)?;
    Ok(Some(Box::new(CacheCandidateIter {
        resource_id: resource.id.clone(),
        lines: BufReader::new(decoder).lines(),
    })))
}

fn fresh_meta(resource: &ResourceSpec, cache_dir: &Path) -> Result<Option<CacheMeta>> {
    let cache_path = data_path(resource, cache_dir);
    let meta_path = meta_path(resource, cache_dir);
    if !cache_path.exists() || !meta_path.exists() {
        return Ok(None);
    }
    let meta = read_meta(resource, cache_dir)?;
    if fresh(resource, &meta)? {
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
    Ok(meta.version == CACHE_VERSION
        && meta.normalizer == NORMALIZER_VERSION
        && meta.resource_id == resource.id
        && meta.local_path == resource.local_path_text
        && meta.byte_len == fingerprint.byte_len
        && meta.modified_unix_nanos == fingerprint.modified_unix_nanos)
}

struct RawCandidateIter {
    inner: CandidateStream,
}

impl Iterator for RawCandidateIter {
    type Item = Result<CachedCandidate>;

    fn next(&mut self) -> Option<Self::Item> {
        let candidate = match self.inner.next()? {
            Ok(candidate) => candidate,
            Err(err) => return Some(Err(err)),
        };
        let normalized = normalized_text(&candidate.sentence);
        Some(Ok(CachedCandidate {
            candidate,
            normalized,
        }))
    }
}

struct CacheCandidateIter<R: BufRead> {
    resource_id: String,
    lines: std::io::Lines<R>,
}

impl<R: BufRead> Iterator for CacheCandidateIter<R> {
    type Item = Result<CachedCandidate>;

    fn next(&mut self) -> Option<Self::Item> {
        let line = match self.lines.next()? {
            Ok(line) => line,
            Err(err) => return Some(Err(err.into())),
        };
        let row = match serde_json::from_str::<CacheRow>(&line) {
            Ok(row) => row,
            Err(err) => return Some(Err(err.into())),
        };
        Some(Ok(CachedCandidate {
            normalized: row.normalized,
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
        }))
    }
}

fn data_path(resource: &ResourceSpec, cache_dir: &Path) -> PathBuf {
    cache_dir.join(format!("{}.jsonl.zst", safe_resource_id(&resource.id)))
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
    use super::safe_resource_id;

    #[test]
    fn safe_resource_id_keeps_partition_names_as_paths() {
        let safe = safe_resource_id("opus#zips/foo.zip");

        assert!(safe.starts_with("opus_zips_foo.zip_"));
        assert!(!safe.contains('#'));
        assert!(!safe.contains('/'));
    }
}
