mod candidate_cache;
mod db;
mod phrase_variant_stress;
mod quality;
mod sources;
mod targets;
mod text;

use aho_corasick::AhoCorasick;
use anyhow::{bail, Context, Result};
use candidate_cache::{
    build_resource_cache, cached_resource_may_contain_any_target_id,
    cached_resource_may_contain_any_token, open_candidate_stream, target_hits_path,
    CacheBuildStats,
};
use clap::{Args, Parser, Subcommand};
use db::ExampleDb;
use phrase_variant_stress::{phrase_variant_stress, PhraseVariantStressArgs};
use quality::{keep_sentence, quality_flags};
use rusqlite::{params, Connection, OpenFlags};
use serde::Serialize;
use sources::{expand_resource_partitions, load_downloaded_resources, ResourceSpec};
use std::collections::{HashMap, HashSet, VecDeque};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::Command as ProcessCommand;
use std::sync::{mpsc, Arc, Mutex, RwLock};
use std::thread;
use std::time::Instant;
use tantivy::collector::{Count, TopDocs};
use tantivy::query::{PhraseQuery, Query, TermQuery};
use tantivy::schema::{
    Field, IndexRecordOption, Schema, TantivyDocument, Value, INDEXED, STORED, STRING, TEXT,
};
use tantivy::{doc, Index, Term};
use targets::{load_targets, MatchKind, Target, TargetMatcher, VariantKind};
use text::normalized_text;

const ALL_SOURCE_IDS: &[&str] = &[
    "macocu-genre-sq",
    "macocu-sq-1.0-xml",
    "cc100-sq",
    "hplt-v3-als-latn",
    "leipzig-sqi",
    "mc4-sq",
    "hf-albanian-wiki-clean-lm",
    "hf-albanian-english-bundled",
    "hf-bigmind-albanian",
    "hf-albanian-wikiorca",
    "fineweb2-albanian-varieties",
    "culturax-sq",
    "wikimedia-sq-latest",
    "seeuniversity-albanian-corpora-bert",
    "ud-albanian-staf",
    "ud-albanian-tsa",
    "opus-en-sq-moses-latest",
    "opus-all-to-sq-moses-latest",
    "tatoeba-full",
];
const COMMIT_EVERY_WRITES: usize = 100_000;

#[derive(Parser)]
#[command(author, version, about)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    Match(MatchArgs),
    TraceTargets(TraceTargetsArgs),
    ReportRawCoverage(ReportRawCoverageArgs),
    PhraseVariantStress(PhraseVariantStressArgs),
    Bench(BenchArgs),
    BuildCandidateCache(BuildCandidateCacheArgs),
    BuildSearchIndex(BuildSearchIndexArgs),
    SearchIndex(SearchIndexArgs),
}

#[derive(Args)]
struct MatchArgs {
    #[arg(long, default_value = ".cache/corpus-targets.json")]
    targets: PathBuf,
    #[arg(long, default_value = ".cache/corpus-local-full.sqlite")]
    out: PathBuf,
    #[arg(long, default_value = "all")]
    sources: String,
    #[arg(long, default_value_t = 3)]
    max_per_target: usize,
    #[arg(long)]
    append: bool,
    #[arg(long, default_value_t = 0)]
    jobs: usize,
    #[arg(long)]
    candidate_cache_dir: Option<PathBuf>,
    #[arg(long)]
    require_candidate_cache: bool,
}

#[derive(Args)]
struct BuildCandidateCacheArgs {
    #[arg(long, default_value = ".cache/corpus-targets.json")]
    targets: PathBuf,
    #[arg(long, default_value = ".cache/corpus-candidate-shards/v1")]
    cache_dir: PathBuf,
    #[arg(long, default_value = "all")]
    sources: String,
    #[arg(long, default_value_t = 0)]
    jobs: usize,
    #[arg(long)]
    refresh: bool,
}

#[derive(Args)]
struct TraceTargetsArgs {
    #[arg(long, default_value = ".cache/corpus-targets.json")]
    targets: PathBuf,
    #[arg(long, default_value = "")]
    target_ids: String,
    #[arg(long)]
    target_ids_file: Option<PathBuf>,
    #[arg(long, default_value = "")]
    forms: String,
    #[arg(long)]
    forms_file: Option<PathBuf>,
    #[arg(long, default_value = ".cache/corpus-local-full.sqlite")]
    source_db: PathBuf,
    #[arg(long, default_value = ".cache/corpus-target-provenance.json")]
    out_json: PathBuf,
    #[arg(long, default_value = ".cache/corpus-target-provenance.md")]
    out_md: PathBuf,
    #[arg(long, default_value = "all")]
    sources: String,
    #[arg(long, default_value_t = 3)]
    max_per_target: usize,
    #[arg(long, default_value_t = 0)]
    jobs: usize,
    #[arg(long, default_value_t = 5)]
    sample_limit: usize,
    #[arg(long)]
    retained_only: bool,
    #[arg(long)]
    candidate_cache_dir: Option<PathBuf>,
    #[arg(long)]
    require_candidate_cache: bool,
}

#[derive(Args)]
struct ReportRawCoverageArgs {
    #[arg(long, default_value = ".cache/corpus-targets.json")]
    targets: PathBuf,
    #[arg(long, default_value = ".cache/corpus-candidate-shards/split-20260620")]
    candidate_cache_dir: PathBuf,
    #[arg(long, default_value = ".cache/corpus-local-full.sqlite")]
    source_db: PathBuf,
    #[arg(long, default_value = ".cache/corpus-raw-coverage-report.json")]
    out_json: PathBuf,
    #[arg(long, default_value = ".cache/corpus-raw-coverage-report.md")]
    out_md: PathBuf,
    #[arg(long, default_value_t = 20)]
    limit: usize,
}

#[derive(Args)]
struct BenchArgs {
    #[arg(long, default_value = ".cache/corpus-local-full.sqlite")]
    source_db: PathBuf,
    #[arg(long, default_value = ".cache/benchmarks/corpus-search")]
    out_dir: PathBuf,
    #[arg(long, default_value_t = 100_000)]
    sample_size: usize,
    #[arg(long, default_value_t = 200)]
    query_limit: usize,
}

#[derive(Args)]
struct BuildSearchIndexArgs {
    #[arg(long, default_value = ".cache/corpus-local-full.sqlite")]
    source_db: PathBuf,
    #[arg(long, default_value = ".cache/corpus-search-tantivy")]
    out_dir: PathBuf,
    #[arg(long, default_value_t = 0)]
    limit: usize,
}

#[derive(Args)]
struct SearchIndexArgs {
    #[arg(long, default_value = ".cache/corpus-search-tantivy")]
    index: PathBuf,
    #[arg(long)]
    query: String,
    #[arg(long, default_value_t = 10)]
    limit: usize,
}

#[derive(Debug)]
struct OwnedMatch {
    id: String,
    target_key: String,
    signature: String,
    kind: MatchKind,
    variant_kind: VariantKind,
    matched_pattern: String,
}

#[derive(Debug)]
struct Hit {
    candidate: sources::Candidate,
    normalized: String,
    flags: Vec<String>,
    flags_json: String,
    matches: Vec<OwnedMatch>,
}

#[derive(Debug)]
struct ResourceStats {
    resource_id: String,
    candidates_seen: usize,
    sentences_inserted: usize,
    empty_candidates: usize,
    quality_rejected: usize,
    unmatched_rejected: usize,
    duration_ms: u128,
}

enum MatchEvent {
    Hit(Hit),
    Done(ResourceStats),
    Error(String),
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Command::Match(args) => match_targets(args),
        Command::TraceTargets(args) => trace_targets(args),
        Command::ReportRawCoverage(args) => report_raw_coverage(args),
        Command::PhraseVariantStress(args) => phrase_variant_stress(args),
        Command::Bench(args) => bench(args),
        Command::BuildCandidateCache(args) => build_candidate_cache(args),
        Command::BuildSearchIndex(args) => build_search_index(args),
        Command::SearchIndex(args) => search_index(args),
    }
}

#[derive(Debug, Clone)]
struct BenchSentence {
    id: i64,
    normalized: String,
}

#[derive(Debug, Clone)]
struct BenchQuery {
    target_key: String,
}

#[derive(Debug, Clone)]
struct SearchIndexSentence {
    id: i64,
    resource_id: String,
    title: Option<String>,
    url: Option<String>,
    domain: Option<String>,
    sentence: String,
    normalized: String,
}

#[derive(Debug, Serialize)]
struct SearchOutput {
    query: String,
    normalized_query: String,
    total_hits: usize,
    elapsed_ms: u128,
    hits: Vec<SearchHit>,
}

#[derive(Debug, Serialize)]
struct SearchHit {
    score: f32,
    id: u64,
    resource_id: String,
    title: Option<String>,
    url: Option<String>,
    domain: Option<String>,
    sentence: String,
    normalized: String,
}

#[derive(Debug, Clone, Default, Serialize)]
struct TraceCounts {
    raw_pattern_matches: usize,
    variant_supported_matches: usize,
    variant_rejected_matches: usize,
    local_cap_dropped_matches: usize,
    quality_rejected_matches: usize,
    emitted_matches_before_writer_cap: usize,
}

impl TraceCounts {
    fn add(&mut self, other: &Self) {
        self.raw_pattern_matches += other.raw_pattern_matches;
        self.variant_supported_matches += other.variant_supported_matches;
        self.variant_rejected_matches += other.variant_rejected_matches;
        self.local_cap_dropped_matches += other.local_cap_dropped_matches;
        self.quality_rejected_matches += other.quality_rejected_matches;
        self.emitted_matches_before_writer_cap += other.emitted_matches_before_writer_cap;
    }
}

#[derive(Debug, Clone, Default, Serialize)]
struct TraceRetainedEvidence {
    retained_occurrences: usize,
    retained_resources: usize,
    retained_variants: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
struct TraceSample {
    target_id: String,
    stage: String,
    resource_id: String,
    doc_id: String,
    title: Option<String>,
    url: Option<String>,
    variant_kind: String,
    matched_pattern: String,
    flags: Vec<String>,
    sentence: String,
}

#[derive(Debug, Clone, Serialize)]
struct TraceResourceOutput {
    resource_id: String,
    counts: TraceCounts,
}

#[derive(Debug, Clone, Serialize)]
struct TraceTargetOutput {
    target_id: String,
    target_key: String,
    lemma: String,
    signature: String,
    counts: TraceCounts,
    retained: TraceRetainedEvidence,
    resources: Vec<TraceResourceOutput>,
    samples: Vec<TraceSample>,
}

#[derive(Debug, Serialize)]
struct TraceReport {
    generated_at: String,
    targets_path: String,
    source_db: String,
    selected_sources: String,
    candidate_cache_dir: Option<String>,
    require_candidate_cache: bool,
    raw_scan_performed: bool,
    resource_partitions: usize,
    skipped_resource_partitions: usize,
    max_per_target: usize,
    sample_limit: usize,
    candidates_seen: usize,
    empty_candidates: usize,
    duration_ms: u128,
    boundaries: Vec<&'static str>,
    targets: Vec<TraceTargetOutput>,
}

#[derive(Debug, Serialize)]
struct RawCoverageReport {
    generated_at: String,
    targets_path: String,
    target_generated_at: Option<String>,
    corpus_version: Option<String>,
    candidate_cache_dir: String,
    source_db: Option<String>,
    retained_db_has_unknown_targets: bool,
    summary: RawCoverageSummary,
    sidecars: RawCoverageSidecars,
    unknown_raw_hit_ids: Vec<String>,
    unknown_retained_hit_ids: Vec<String>,
    top_raw_miss_verbs: Vec<RawCoverageGroup>,
    top_raw_miss_signatures: Vec<RawCoverageGroup>,
}

#[derive(Debug, Serialize)]
struct RawCoverageSummary {
    total_targets: usize,
    raw_hit_targets: usize,
    raw_miss_targets: usize,
    raw_hit_rate: f64,
    retained_hit_targets: Option<usize>,
    retained_miss_targets: Option<usize>,
    raw_hit_not_retained_targets: Option<usize>,
    verbs: usize,
    verbs_with_zero_raw_hits: usize,
    verbs_with_all_raw_hits: usize,
    unknown_raw_hit_ids: usize,
    unknown_retained_hit_ids: Option<usize>,
}

#[derive(Debug, Serialize)]
struct RawCoverageSidecars {
    files: usize,
    bytes: u64,
    target_ids: usize,
}

#[derive(Debug, Serialize)]
struct RawCoverageGroup {
    key: String,
    total: usize,
    raw_hit: usize,
    raw_miss: usize,
    raw_hit_rate: f64,
    retained_hit: Option<usize>,
    retained_hit_rate: Option<f64>,
}

#[derive(Default)]
struct RawCoverageGroupAcc {
    total: usize,
    raw_hit: usize,
    retained_hit: usize,
}

#[derive(Debug)]
struct TraceResourceStats {
    resource_id: String,
    candidates_seen: usize,
    empty_candidates: usize,
    duration_ms: u128,
    counts_by_target: HashMap<String, TraceCounts>,
    samples: Vec<TraceSample>,
}

enum TraceEvent {
    Done(TraceResourceStats),
    Error(String),
}

#[derive(Debug, Serialize)]
struct BenchReport {
    generated_at: String,
    source_db: String,
    sample_size: usize,
    query_count: usize,
    results: Vec<BenchResult>,
}

#[derive(Debug, Serialize)]
struct BenchResult {
    engine: String,
    status: String,
    index_ms: u128,
    query_ms: u128,
    total_hits: usize,
    index_bytes: u64,
    notes: String,
}

fn bench(args: BenchArgs) -> Result<()> {
    fs::create_dir_all(&args.out_dir)?;
    let sentences = load_bench_sentences(&args.source_db, args.sample_size)?;
    let queries = load_bench_queries(&args.source_db, args.query_limit)?;
    if sentences.is_empty() {
        bail!(
            "no sample sentences loaded from {}",
            args.source_db.display()
        );
    }
    if queries.is_empty() {
        bail!(
            "no benchmark queries loaded from {}",
            args.source_db.display()
        );
    }

    let mut results = Vec::new();
    results.push(bench_aho_batch(&sentences, &queries)?);
    results.push(bench_sqlite_fts(&args.out_dir, &sentences, &queries)?);
    results.push(bench_tantivy(&args.out_dir, &sentences, &queries)?);
    results.push(bench_ripgrep(&args.out_dir, &sentences, &queries)?);

    let report = BenchReport {
        generated_at: current_timestamp()?,
        source_db: args.source_db.display().to_string(),
        sample_size: sentences.len(),
        query_count: queries.len(),
        results,
    };
    let out_path = args.out_dir.join("results.json");
    fs::write(&out_path, serde_json::to_string_pretty(&report)? + "\n")?;
    println!("Wrote {}", out_path.display());
    Ok(())
}

fn build_search_index(args: BuildSearchIndexArgs) -> Result<()> {
    let sentences = load_search_index_sentences(&args.source_db, args.limit)?;
    if sentences.is_empty() {
        bail!("no sentences loaded from {}", args.source_db.display());
    }

    remove_dir_if_exists(&args.out_dir)?;
    fs::create_dir_all(&args.out_dir)?;
    let mut schema_builder = Schema::builder();
    let id = schema_builder.add_u64_field("id", INDEXED | STORED);
    let resource_id = schema_builder.add_text_field("resource_id", STRING | STORED);
    let title = schema_builder.add_text_field("title", STORED);
    let url = schema_builder.add_text_field("url", STORED);
    let domain = schema_builder.add_text_field("domain", STORED);
    let sentence = schema_builder.add_text_field("sentence", STORED);
    let normalized = schema_builder.add_text_field("normalized", TEXT | STORED);
    let schema = schema_builder.build();

    let started = Instant::now();
    let index = Index::create_in_dir(&args.out_dir, schema)?;
    let mut writer = index.writer(256_000_000)?;
    for row in &sentences {
        let mut doc = TantivyDocument::default();
        doc.add_u64(id, row.id as u64);
        doc.add_text(resource_id, &row.resource_id);
        if let Some(value) = &row.title {
            doc.add_text(title, value);
        }
        if let Some(value) = &row.url {
            doc.add_text(url, value);
        }
        if let Some(value) = &row.domain {
            doc.add_text(domain, value);
        }
        doc.add_text(sentence, &row.sentence);
        doc.add_text(normalized, &row.normalized);
        writer.add_document(doc)?;
    }
    writer.commit()?;

    println!(
        "Wrote {} with {} sentence(s) in {:.1}s ({:.1} MB)",
        args.out_dir.display(),
        sentences.len(),
        started.elapsed().as_secs_f64(),
        dir_size(&args.out_dir)? as f64 / 1024.0 / 1024.0
    );
    Ok(())
}

fn search_index(args: SearchIndexArgs) -> Result<()> {
    if args.limit == 0 {
        bail!("--limit must be greater than zero");
    }

    let normalized_query = normalized_text(&args.query);
    if normalized_query.is_empty() {
        bail!("query normalizes to an empty string");
    }

    let index = Index::open_in_dir(&args.index)
        .with_context(|| format!("open {}", args.index.display()))?;
    let schema = index.schema();
    let id = schema
        .get_field("id")
        .context("index is missing id field")?;
    let resource_id = schema
        .get_field("resource_id")
        .context("index is missing resource_id field")?;
    let title = schema
        .get_field("title")
        .context("index is missing title field")?;
    let url = schema
        .get_field("url")
        .context("index is missing url field")?;
    let domain = schema
        .get_field("domain")
        .context("index is missing domain field")?;
    let sentence = schema
        .get_field("sentence")
        .context("index is missing sentence field")?;
    let normalized = schema
        .get_field("normalized")
        .context("index is missing normalized field")?;
    let query = tantivy_phrase_query(normalized, &normalized_query);
    let reader = index.reader()?;
    let searcher = reader.searcher();

    let started = Instant::now();
    let (top_docs, total_hits) = searcher.search(
        &*query,
        &(TopDocs::with_limit(args.limit).order_by_score(), Count),
    )?;
    let mut hits = Vec::new();
    for (score, doc_address) in top_docs {
        let doc = searcher.doc::<TantivyDocument>(doc_address)?;
        hits.push(SearchHit {
            score,
            id: doc_u64(&doc, id).unwrap_or_default(),
            resource_id: doc_text(&doc, resource_id).unwrap_or_default(),
            title: doc_text(&doc, title),
            url: doc_text(&doc, url),
            domain: doc_text(&doc, domain),
            sentence: doc_text(&doc, sentence).unwrap_or_default(),
            normalized: doc_text(&doc, normalized).unwrap_or_default(),
        });
    }

    let output = SearchOutput {
        query: args.query,
        normalized_query,
        total_hits,
        elapsed_ms: started.elapsed().as_millis(),
        hits,
    };
    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}

fn trace_targets(args: TraceTargetsArgs) -> Result<()> {
    if args.max_per_target == 0 {
        bail!("--max-per-target must be greater than zero");
    }

    let all_targets = load_targets(&args.targets)
        .with_context(|| format!("load targets from {}", args.targets.display()))?;
    let selected_targets = select_trace_targets(&all_targets, &args)?;
    if selected_targets.is_empty() {
        bail!("no targets matched requested target IDs or forms");
    }

    if args.retained_only {
        return retained_only_trace(args, selected_targets);
    }

    let repo_root = std::env::current_dir().context("read current directory")?;
    let selected_resources = select_resources(&repo_root, &args.sources)?;
    if selected_resources.is_empty() {
        bail!(
            "no matching downloaded resources for --sources={}",
            args.sources
        );
    }
    let mut resources = Vec::new();
    for resource in selected_resources {
        resources.extend(expand_resource_partitions(&resource)?);
    }

    let selected_ids = selected_targets
        .iter()
        .map(|target| target.id.clone())
        .collect::<HashSet<_>>();
    let target_matcher = Arc::new(TargetMatcher::new_with_anchor_prefilter(
        selected_targets.clone(),
    )?);
    let original_resource_partitions = resources.len();
    let skipped_resource_partitions = skip_trace_resources_by_inventory(
        &mut resources,
        args.candidate_cache_dir.as_deref(),
        &args.targets,
        &selected_ids,
        target_matcher.anchor_tokens(),
    )?;
    let (tx, rx) = mpsc::channel();
    let started = Instant::now();

    println!(
        "Trace target scan: {} source partition(s), {} skipped by inventory, {} selected target row(s)",
        resources.len(),
        skipped_resource_partitions,
        selected_targets.len()
    );

    let jobs = match args.jobs {
        0 => thread::available_parallelism()
            .map(|count| count.get())
            .unwrap_or(4),
        explicit => explicit,
    }
    .clamp(1, resources.len().max(1));
    let work = Arc::new(Mutex::new(
        resources.clone().into_iter().collect::<VecDeque<_>>(),
    ));
    let selected_ids = Arc::new(selected_ids);
    let mut handles = Vec::new();
    for _ in 0..jobs {
        let worker_tx = tx.clone();
        let worker_matcher = Arc::clone(&target_matcher);
        let worker_work = Arc::clone(&work);
        let worker_selected_ids = Arc::clone(&selected_ids);
        let max_per_target = args.max_per_target;
        let sample_limit = args.sample_limit;
        let candidate_cache_dir = args.candidate_cache_dir.clone();
        let require_candidate_cache = args.require_candidate_cache;
        handles.push(thread::spawn(move || loop {
            let Some(resource) = worker_work.lock().expect("work queue").pop_front() else {
                break;
            };
            trace_resource(
                resource,
                Arc::clone(&worker_matcher),
                Arc::clone(&worker_selected_ids),
                max_per_target,
                sample_limit,
                candidate_cache_dir.clone(),
                require_candidate_cache,
                worker_tx.clone(),
            );
        }));
    }
    drop(tx);

    let mut counts_by_target = HashMap::<String, TraceCounts>::new();
    let mut resource_counts_by_target = HashMap::<String, HashMap<String, TraceCounts>>::new();
    let mut samples_by_target = HashMap::<String, Vec<TraceSample>>::new();
    let mut candidates_seen = 0usize;
    let mut empty_candidates = 0usize;
    let mut errors = Vec::new();

    for event in rx {
        match event {
            TraceEvent::Done(stats) => {
                candidates_seen += stats.candidates_seen;
                empty_candidates += stats.empty_candidates;
                println!(
                    "  {}: {} candidates in {:.1}s",
                    stats.resource_id,
                    stats.candidates_seen,
                    stats.duration_ms as f64 / 1000.0
                );
                for (target_id, counts) in stats.counts_by_target {
                    counts_by_target
                        .entry(target_id.clone())
                        .or_default()
                        .add(&counts);
                    resource_counts_by_target
                        .entry(target_id)
                        .or_default()
                        .insert(stats.resource_id.clone(), counts);
                }
                for sample in stats.samples {
                    let target_samples = samples_by_target
                        .entry(sample.target_id.clone())
                        .or_default();
                    if target_samples.len() < args.sample_limit {
                        target_samples.push(sample);
                    }
                }
            }
            TraceEvent::Error(err) => errors.push(err),
        }
    }

    for handle in handles {
        handle.join().expect("trace worker thread panicked");
    }
    if !errors.is_empty() {
        bail!(
            "{} trace worker(s) failed:\n{}",
            errors.len(),
            errors.join("\n")
        );
    }

    let retained = retained_trace_evidence(&args.source_db, &selected_targets)?;
    let mut target_outputs = Vec::new();
    for target in &selected_targets {
        let mut resources = resource_counts_by_target
            .remove(&target.id)
            .unwrap_or_default()
            .into_iter()
            .map(|(resource_id, counts)| TraceResourceOutput {
                resource_id,
                counts,
            })
            .collect::<Vec<_>>();
        resources.sort_by(|a, b| {
            b.counts
                .raw_pattern_matches
                .cmp(&a.counts.raw_pattern_matches)
                .then_with(|| a.resource_id.cmp(&b.resource_id))
        });
        target_outputs.push(TraceTargetOutput {
            target_id: target.id.clone(),
            target_key: target.target_key.clone(),
            lemma: target.lemma.clone(),
            signature: target.signature.clone(),
            counts: counts_by_target.remove(&target.id).unwrap_or_default(),
            retained: retained.get(&target.id).cloned().unwrap_or_default(),
            resources,
            samples: samples_by_target.remove(&target.id).unwrap_or_default(),
        });
    }

    let report = TraceReport {
        generated_at: current_timestamp()?,
        targets_path: args.targets.display().to_string(),
        source_db: args.source_db.display().to_string(),
        selected_sources: args.sources,
        candidate_cache_dir: args
            .candidate_cache_dir
            .as_ref()
            .map(|path| path.display().to_string()),
        require_candidate_cache: args.require_candidate_cache,
        raw_scan_performed: true,
        resource_partitions: original_resource_partitions,
        skipped_resource_partitions,
        max_per_target: args.max_per_target,
        sample_limit: args.sample_limit,
        candidates_seen,
        empty_candidates,
        duration_ms: started.elapsed().as_millis(),
        boundaries: vec![
            "Raw pattern matches are scanner matches for selected generated target patterns only.",
            "Variant-supported matches apply the same variant guard as the production scanner.",
            "Local cap drops mean one source partition already emitted --max-per-target matches for that target; this is not the global SQLite writer cap.",
            "Quality-rejected matches failed the current sentence quality filters before writer retention.",
            "Emitted matches are worker output before the global SQLite writer cap.",
            "Retained occurrences are read from the supplied SQLite DB and may come from an earlier scan.",
            "When --candidate-cache-dir is supplied, the trace reads cached normalized candidates where fresh shards exist and preserves raw-resource fallback unless --require-candidate-cache is set.",
            "Fresh split-cache target inventories may skip source partitions where no selected generated target ID had a raw normalized pattern match; stale or missing target inventories fall back to token inventories.",
        ],
        targets: target_outputs,
    };

    write_trace_report(&report, &args.out_json, &args.out_md)?;
    Ok(())
}

fn retained_only_trace(args: TraceTargetsArgs, selected_targets: Vec<Target>) -> Result<()> {
    if !args.source_db.exists() {
        bail!(
            "--retained-only requires an existing --source-db: {}",
            args.source_db.display()
        );
    }

    let started = Instant::now();
    let retained = retained_trace_evidence(&args.source_db, &selected_targets)?;
    let mut samples =
        retained_trace_samples(&args.source_db, &selected_targets, args.sample_limit)?;
    let targets = selected_targets
        .iter()
        .map(|target| TraceTargetOutput {
            target_id: target.id.clone(),
            target_key: target.target_key.clone(),
            lemma: target.lemma.clone(),
            signature: target.signature.clone(),
            counts: TraceCounts::default(),
            retained: retained.get(&target.id).cloned().unwrap_or_default(),
            resources: Vec::new(),
            samples: samples.remove(&target.id).unwrap_or_default(),
        })
        .collect();

    let report = TraceReport {
        generated_at: current_timestamp()?,
        targets_path: args.targets.display().to_string(),
        source_db: args.source_db.display().to_string(),
        selected_sources: "retained-only".to_owned(),
        candidate_cache_dir: args
            .candidate_cache_dir
            .as_ref()
            .map(|path| path.display().to_string()),
        require_candidate_cache: args.require_candidate_cache,
        raw_scan_performed: false,
        resource_partitions: 0,
        skipped_resource_partitions: 0,
        max_per_target: args.max_per_target,
        sample_limit: args.sample_limit,
        candidates_seen: 0,
        empty_candidates: 0,
        duration_ms: started.elapsed().as_millis(),
        boundaries: vec![
            "Retained-only mode reads examples already stored in the supplied SQLite DB.",
            "Raw corpus resources were not scanned, so raw matches, variant rejects, cap drops, and quality rejects are unavailable.",
            "Retained occurrences may come from an earlier scan and are not proof of exhaustive corpus absence.",
        ],
        targets,
    };
    write_trace_report(&report, &args.out_json, &args.out_md)
}

fn report_raw_coverage(args: ReportRawCoverageArgs) -> Result<()> {
    if args.limit == 0 {
        bail!("--limit must be greater than zero");
    }
    if !args.targets.exists() {
        bail!("missing targets file: {}", args.targets.display());
    }
    if !args.candidate_cache_dir.exists() {
        bail!(
            "missing candidate cache dir: {}",
            args.candidate_cache_dir.display()
        );
    }

    let targets = load_targets(&args.targets)
        .with_context(|| format!("load targets from {}", args.targets.display()))?;
    if targets.is_empty() {
        bail!("no targets in {}", args.targets.display());
    }
    let target_meta = read_target_file_metadata(&args.targets)?;
    let target_ids = targets
        .iter()
        .map(|target| target.id.clone())
        .collect::<HashSet<_>>();
    let repo_root = std::env::current_dir().context("read current directory")?;
    let resources = all_downloaded_partitions(&repo_root)?;
    let (raw_hit_ids, sidecars) =
        read_raw_hit_sidecars(&resources, &args.candidate_cache_dir, &args.targets)?;
    let retained_hit_ids = if args.source_db.exists() {
        Some(read_retained_hit_ids(&args.source_db)?)
    } else {
        None
    };

    let raw_hit_targets = targets
        .iter()
        .filter(|target| raw_hit_ids.contains(&target.id))
        .count();
    let retained_hit_targets = retained_hit_ids.as_ref().map(|retained| {
        targets
            .iter()
            .filter(|target| retained.contains(&target.id))
            .count()
    });
    let raw_hit_not_retained_targets = retained_hit_ids.as_ref().map(|retained| {
        targets
            .iter()
            .filter(|target| raw_hit_ids.contains(&target.id) && !retained.contains(&target.id))
            .count()
    });
    let verb_groups = raw_coverage_groups(
        &targets,
        &raw_hit_ids,
        retained_hit_ids.as_ref(),
        |target| target.verb_id.clone(),
        usize::MAX,
    );
    let verbs_with_zero_raw_hits = verb_groups
        .iter()
        .filter(|group| group.raw_hit == 0)
        .count();
    let verbs_with_all_raw_hits = verb_groups
        .iter()
        .filter(|group| group.raw_hit == group.total)
        .count();
    let unknown_raw_hit_id_count = raw_hit_ids
        .iter()
        .filter(|id| !target_ids.contains(*id))
        .count();
    let unknown_raw_hit_ids = unknown_ids(&raw_hit_ids, &target_ids, args.limit);
    let unknown_retained_hit_ids = retained_hit_ids
        .as_ref()
        .map(|retained| unknown_ids(retained, &target_ids, args.limit))
        .unwrap_or_default();
    let unknown_retained_hit_id_count = retained_hit_ids.as_ref().map(|retained| {
        retained
            .iter()
            .filter(|id| !target_ids.contains(*id))
            .count()
    });
    let summary = RawCoverageSummary {
        total_targets: targets.len(),
        raw_hit_targets,
        raw_miss_targets: targets.len() - raw_hit_targets,
        raw_hit_rate: ratio(raw_hit_targets, targets.len()),
        retained_hit_targets,
        retained_miss_targets: retained_hit_targets.map(|count| targets.len() - count),
        raw_hit_not_retained_targets,
        verbs: verb_groups.len(),
        verbs_with_zero_raw_hits,
        verbs_with_all_raw_hits,
        unknown_raw_hit_ids: unknown_raw_hit_id_count,
        unknown_retained_hit_ids: unknown_retained_hit_id_count,
    };
    let top_raw_miss_verbs = verb_groups.into_iter().take(args.limit).collect();
    let top_raw_miss_signatures = raw_coverage_groups(
        &targets,
        &raw_hit_ids,
        retained_hit_ids.as_ref(),
        |target| target.signature.clone(),
        args.limit,
    );
    let report = RawCoverageReport {
        generated_at: current_timestamp()?,
        targets_path: args.targets.display().to_string(),
        target_generated_at: target_meta.0,
        corpus_version: target_meta.1,
        candidate_cache_dir: args.candidate_cache_dir.display().to_string(),
        source_db: args
            .source_db
            .exists()
            .then(|| args.source_db.display().to_string()),
        retained_db_has_unknown_targets: unknown_retained_hit_id_count.unwrap_or(0) > 0,
        summary,
        sidecars,
        unknown_raw_hit_ids,
        unknown_retained_hit_ids,
        top_raw_miss_verbs,
        top_raw_miss_signatures,
    };
    write_raw_coverage_report(&report, &args.out_json, &args.out_md)?;
    println!(
        "Wrote {} and {}: {} raw hit target(s), {} raw miss target(s)",
        args.out_json.display(),
        args.out_md.display(),
        report.summary.raw_hit_targets,
        report.summary.raw_miss_targets
    );
    Ok(())
}

fn read_target_file_metadata(path: &Path) -> Result<(Option<String>, Option<String>)> {
    let raw = fs::read_to_string(path).with_context(|| format!("read {}", path.display()))?;
    let json: serde_json::Value = serde_json::from_str(&raw)?;
    Ok((
        json.get("generatedAt")
            .and_then(serde_json::Value::as_str)
            .map(ToOwned::to_owned),
        json.get("corpusVersion")
            .and_then(serde_json::Value::as_str)
            .map(ToOwned::to_owned),
    ))
}

fn read_raw_hit_sidecars(
    resources: &[ResourceSpec],
    cache_dir: &Path,
    targets_path: &Path,
) -> Result<(HashSet<String>, RawCoverageSidecars)> {
    let target_modified = fs::metadata(targets_path)
        .with_context(|| format!("stat {}", targets_path.display()))?
        .modified()?;
    let mut ids = HashSet::new();
    let mut files = 0usize;
    let mut bytes = 0u64;
    let mut stale_files = 0usize;
    let mut missing = Vec::new();
    for resource in resources {
        let path = target_hits_path(resource, cache_dir);
        if !path.exists() {
            missing.push(resource.id.clone());
            continue;
        }
        files += 1;
        let metadata = fs::metadata(&path)?;
        bytes += metadata.len();
        if metadata.modified()? < target_modified {
            stale_files += 1;
        }
        let file = fs::File::open(&path).with_context(|| format!("open {}", path.display()))?;
        let lines = BufReader::new(zstd::stream::read::Decoder::new(file)?).lines();
        for line in lines {
            let id = line?;
            if !id.is_empty() {
                ids.insert(id);
            }
        }
    }
    if !missing.is_empty() {
        let shown = missing.iter().take(10).cloned().collect::<Vec<_>>();
        bail!(
            "missing {} target-hit sidecar(s) in {} for configured downloaded partitions; first: {}",
            missing.len(),
            cache_dir.display(),
            shown.join(", ")
        );
    }
    if stale_files > 0 {
        bail!("{stale_files} target-hit sidecar(s) are older than the target file");
    }
    let target_ids = ids.len();
    Ok((
        ids,
        RawCoverageSidecars {
            files,
            bytes,
            target_ids,
        },
    ))
}

pub(crate) fn all_downloaded_partitions(repo_root: &Path) -> Result<Vec<ResourceSpec>> {
    let mut resources = Vec::new();
    for resource in load_downloaded_resources(repo_root)? {
        resources.extend(expand_resource_partitions(&resource)?);
    }
    if resources.is_empty() {
        bail!("no downloaded corpus resources configured");
    }
    Ok(resources)
}

fn read_retained_hit_ids(path: &Path) -> Result<HashSet<String>> {
    let con = readonly_connection(path)?;
    let mut stmt = con.prepare("SELECT DISTINCT target_id FROM occurrences")?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    let mut ids = HashSet::new();
    for row in rows {
        ids.insert(row?);
    }
    Ok(ids)
}

fn raw_coverage_groups<F>(
    targets: &[Target],
    raw_hit_ids: &HashSet<String>,
    retained_hit_ids: Option<&HashSet<String>>,
    key_for: F,
    limit: usize,
) -> Vec<RawCoverageGroup>
where
    F: Fn(&Target) -> String,
{
    let mut acc = HashMap::<String, RawCoverageGroupAcc>::new();
    for target in targets {
        let entry = acc.entry(key_for(target)).or_default();
        entry.total += 1;
        if raw_hit_ids.contains(&target.id) {
            entry.raw_hit += 1;
        }
        if retained_hit_ids.is_some_and(|ids| ids.contains(&target.id)) {
            entry.retained_hit += 1;
        }
    }
    let mut groups = acc
        .into_iter()
        .map(|(key, entry)| {
            let raw_miss = entry.total - entry.raw_hit;
            RawCoverageGroup {
                key,
                total: entry.total,
                raw_hit: entry.raw_hit,
                raw_miss,
                raw_hit_rate: ratio(entry.raw_hit, entry.total),
                retained_hit: retained_hit_ids.map(|_| entry.retained_hit),
                retained_hit_rate: retained_hit_ids.map(|_| ratio(entry.retained_hit, entry.total)),
            }
        })
        .collect::<Vec<_>>();
    groups.sort_by(|a, b| {
        b.raw_miss
            .cmp(&a.raw_miss)
            .then_with(|| a.raw_hit.cmp(&b.raw_hit))
            .then_with(|| a.key.cmp(&b.key))
    });
    groups.truncate(limit);
    groups
}

fn unknown_ids(ids: &HashSet<String>, target_ids: &HashSet<String>, limit: usize) -> Vec<String> {
    let mut unknown = ids
        .iter()
        .filter(|id| !target_ids.contains(*id))
        .cloned()
        .collect::<Vec<_>>();
    unknown.sort();
    unknown.truncate(limit);
    unknown
}

fn write_raw_coverage_report(
    report: &RawCoverageReport,
    out_json: &Path,
    out_md: &Path,
) -> Result<()> {
    if let Some(parent) = out_json.parent() {
        fs::create_dir_all(parent)?;
    }
    if let Some(parent) = out_md.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(out_json, serde_json::to_string_pretty(report)? + "\n")?;
    fs::write(out_md, raw_coverage_markdown(report))?;
    Ok(())
}

fn raw_coverage_markdown(report: &RawCoverageReport) -> String {
    let retained_hit = report
        .summary
        .retained_hit_targets
        .map_or_else(|| "n/a".to_owned(), |count| count.to_string());
    let retained_miss = report
        .summary
        .retained_miss_targets
        .map_or_else(|| "n/a".to_owned(), |count| count.to_string());
    let raw_hit_not_retained = report
        .summary
        .raw_hit_not_retained_targets
        .map_or_else(|| "n/a".to_owned(), |count| count.to_string());
    let unknown_retained = report
        .summary
        .unknown_retained_hit_ids
        .map_or_else(|| "n/a".to_owned(), |count| count.to_string());
    let mut lines = vec![
        "# Corpus Raw-Hit Coverage".to_owned(),
        String::new(),
        format!("Generated: {}", report.generated_at),
        format!("Targets: {}", report.targets_path),
        format!(
            "Target generated at: {}",
            report.target_generated_at.as_deref().unwrap_or("unknown")
        ),
        format!("Candidate cache: {}", report.candidate_cache_dir),
        format!(
            "Retained DB: {}",
            report.source_db.as_deref().unwrap_or("not found")
        ),
        format!(
            "Retained DB stale target IDs: {}",
            if report.retained_db_has_unknown_targets {
                "yes"
            } else {
                "no"
            }
        ),
        String::new(),
        "## Summary".to_owned(),
        String::new(),
        format!("- Total targets: {}", report.summary.total_targets),
        format!(
            "- Raw-hit targets: {} ({})",
            report.summary.raw_hit_targets,
            pct(report.summary.raw_hit_rate)
        ),
        format!("- Raw-miss targets: {}", report.summary.raw_miss_targets),
        format!("- Retained-hit targets: {retained_hit}"),
        format!("- Retained-miss targets: {retained_miss}"),
        format!("- Raw-hit but not retained targets: {raw_hit_not_retained}"),
        format!("- Verb IDs: {}", report.summary.verbs),
        format!(
            "- Verbs with zero raw hits: {}",
            report.summary.verbs_with_zero_raw_hits
        ),
        format!(
            "- Verbs with all targets raw-hit: {}",
            report.summary.verbs_with_all_raw_hits
        ),
        format!(
            "- Unknown sidecar target IDs: {}",
            report.summary.unknown_raw_hit_ids
        ),
        format!("- Unknown retained DB target IDs: {unknown_retained}"),
        String::new(),
        "## Sidecars".to_owned(),
        String::new(),
        format!("- Files: {}", report.sidecars.files),
        format!("- Bytes: {}", report.sidecars.bytes),
        format!(
            "- Unique target IDs in sidecars: {}",
            report.sidecars.target_ids
        ),
        String::new(),
        "## Worst Verb Gaps".to_owned(),
        String::new(),
        coverage_group_table_header(),
    ];
    for group in &report.top_raw_miss_verbs {
        lines.push(coverage_group_table_row(group));
    }
    lines.extend([
        String::new(),
        "## Worst Signature Gaps".to_owned(),
        String::new(),
        coverage_group_table_header(),
    ]);
    for group in &report.top_raw_miss_signatures {
        lines.push(coverage_group_table_row(group));
    }
    if !report.unknown_raw_hit_ids.is_empty() || !report.unknown_retained_hit_ids.is_empty() {
        lines.extend([
            String::new(),
            "## Unknown Target IDs".to_owned(),
            String::new(),
        ]);
        for id in &report.unknown_raw_hit_ids {
            lines.push(format!("- Raw sidecar: `{}`", md_escape(id)));
        }
        for id in &report.unknown_retained_hit_ids {
            lines.push(format!("- Retained DB: `{}`", md_escape(id)));
        }
    }
    lines.push(String::new());
    lines.join("\n")
}

fn coverage_group_table_header() -> String {
    "| Key | Total | Raw Hit | Raw Miss | Raw Hit Rate | Retained Hit | Retained Hit Rate |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |"
        .to_owned()
}

fn coverage_group_table_row(group: &RawCoverageGroup) -> String {
    let retained_hit = group
        .retained_hit
        .map_or_else(|| "n/a".to_owned(), |count| count.to_string());
    let retained_hit_rate = group
        .retained_hit_rate
        .map_or_else(|| "n/a".to_owned(), pct);
    format!(
        "| {} | {} | {} | {} | {} | {} | {} |",
        md_escape(&group.key),
        group.total,
        group.raw_hit,
        group.raw_miss,
        pct(group.raw_hit_rate),
        retained_hit,
        retained_hit_rate
    )
}

fn ratio(part: usize, total: usize) -> f64 {
    if total == 0 {
        0.0
    } else {
        part as f64 / total as f64
    }
}

fn pct(value: f64) -> String {
    format!("{:.1}%", value * 100.0)
}

fn write_trace_report(report: &TraceReport, out_json: &Path, out_md: &Path) -> Result<()> {
    if let Some(parent) = out_json.parent() {
        fs::create_dir_all(parent)?;
    }
    if let Some(parent) = out_md.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(out_json, serde_json::to_string_pretty(report)? + "\n")?;
    fs::write(out_md, trace_markdown(report))?;
    println!("Wrote {}", out_json.display());
    println!("Wrote {}", out_md.display());
    Ok(())
}

fn select_trace_targets(targets: &[Target], args: &TraceTargetsArgs) -> Result<Vec<Target>> {
    let mut requested_id_values = split_csv(&args.target_ids);
    if let Some(path) = &args.target_ids_file {
        requested_id_values.extend(read_selection_file(path)?);
    }
    let mut requested_form_values = split_csv(&args.forms);
    if let Some(path) = &args.forms_file {
        requested_form_values.extend(read_selection_file(path)?);
    }
    let requested_ids = requested_id_values.iter().cloned().collect::<HashSet<_>>();
    let requested_forms = requested_form_values
        .iter()
        .map(|form| normalized_text(&form))
        .collect::<HashSet<_>>();
    if requested_ids.is_empty() && requested_forms.is_empty() {
        bail!("provide --target-ids, --target-ids-file, --forms, or --forms-file");
    }

    let selected = targets
        .iter()
        .filter(|target| {
            requested_ids.contains(&target.id)
                || requested_forms.contains(&normalized_text(&target.target_key))
        })
        .cloned()
        .collect::<Vec<_>>();

    let found_ids = selected
        .iter()
        .map(|target| target.id.clone())
        .collect::<HashSet<_>>();
    let missing_ids = requested_ids
        .into_iter()
        .filter(|id| !found_ids.contains(id))
        .collect::<Vec<_>>();
    if !missing_ids.is_empty() {
        bail!("unknown target id(s): {}", missing_ids.join(", "));
    }
    let found_forms = selected
        .iter()
        .map(|target| normalized_text(&target.target_key))
        .collect::<HashSet<_>>();
    let missing_forms = requested_form_values
        .into_iter()
        .filter(|form| !found_forms.contains(&normalized_text(form)))
        .collect::<Vec<_>>();
    if !missing_forms.is_empty() {
        bail!("unknown form(s): {}", missing_forms.join(", "));
    }

    Ok(selected)
}

fn skip_trace_resources_by_inventory(
    resources: &mut Vec<ResourceSpec>,
    candidate_cache_dir: Option<&Path>,
    targets_path: &Path,
    selected_ids: &HashSet<String>,
    fallback_tokens: Option<&HashSet<String>>,
) -> Result<usize> {
    let Some(cache_dir) = candidate_cache_dir else {
        return Ok(0);
    };
    let original = std::mem::take(resources);
    let mut kept = Vec::with_capacity(original.len());
    let mut skipped = 0usize;
    for resource in original {
        match cached_resource_may_contain_any_target_id(
            &resource,
            cache_dir,
            targets_path,
            selected_ids,
        )? {
            Some(false) => {
                skipped += 1;
            }
            Some(true) => kept.push(resource),
            None => match fallback_tokens {
                Some(tokens) => {
                    match cached_resource_may_contain_any_token(&resource, cache_dir, tokens)? {
                        Some(false) => skipped += 1,
                        Some(true) | None => kept.push(resource),
                    }
                }
                None => kept.push(resource),
            },
        }
    }
    *resources = kept;
    Ok(skipped)
}

pub(crate) fn split_csv(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

fn read_selection_file(path: &Path) -> Result<Vec<String>> {
    let values = fs::read_to_string(path)
        .with_context(|| format!("read selection file {}", path.display()))?
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>();
    if values.is_empty() {
        bail!("selection file has no usable values: {}", path.display());
    }
    Ok(values)
}

fn trace_resource(
    resource: ResourceSpec,
    target_matcher: Arc<TargetMatcher>,
    selected_ids: Arc<HashSet<String>>,
    max_per_target: usize,
    sample_limit: usize,
    candidate_cache_dir: Option<PathBuf>,
    require_candidate_cache: bool,
    tx: mpsc::Sender<TraceEvent>,
) {
    let resource_id = resource.id.clone();
    if let Err(err) = trace_resource_inner(
        resource,
        target_matcher,
        selected_ids,
        max_per_target,
        sample_limit,
        candidate_cache_dir,
        require_candidate_cache,
        &tx,
    ) {
        let _ = tx.send(TraceEvent::Error(format!("{resource_id}: {err:#}")));
    }
}

fn trace_resource_inner(
    resource: ResourceSpec,
    target_matcher: Arc<TargetMatcher>,
    selected_ids: Arc<HashSet<String>>,
    max_per_target: usize,
    sample_limit: usize,
    candidate_cache_dir: Option<PathBuf>,
    require_candidate_cache: bool,
    tx: &mpsc::Sender<TraceEvent>,
) -> Result<()> {
    let started = Instant::now();
    let mut candidates_seen = 0usize;
    let mut empty_candidates = 0usize;
    let mut local_counts = HashMap::<String, usize>::new();
    let mut counts_by_target = HashMap::<String, TraceCounts>::new();
    let mut samples = Vec::<TraceSample>::new();
    let mut sample_counts = HashMap::<String, usize>::new();
    let mut stream = open_candidate_stream(
        &resource,
        candidate_cache_dir.as_deref(),
        require_candidate_cache,
    )
    .with_context(|| format!("open candidates for {}", resource.id))?;

    while let Some(item) = stream.next_normalized() {
        let cached = item.with_context(|| format!("read source {}", resource.id))?;
        let normalized = cached.normalized;
        candidates_seen += 1;
        if candidates_seen.is_multiple_of(1_000_000) {
            println!("  {}: {candidates_seen} trace candidates", resource.id);
        }

        if normalized.is_empty() {
            empty_candidates += 1;
            continue;
        }

        let raw_matches = target_matcher
            .matches_normalized(&normalized)
            .into_iter()
            .filter(|matched| selected_ids.contains(matched.id))
            .collect::<Vec<_>>();
        if raw_matches.is_empty() {
            continue;
        }

        let candidate = stream.current_candidate()?;
        let mut quality_candidates = Vec::new();
        for matched in raw_matches {
            let counts = counts_by_target.entry(matched.id.to_owned()).or_default();
            counts.raw_pattern_matches += 1;

            if !variant_supported_by_raw_sentence(matched.variant_kind, &candidate.sentence) {
                counts.variant_rejected_matches += 1;
                push_trace_sample(
                    &mut samples,
                    &mut sample_counts,
                    sample_limit,
                    &candidate,
                    &matched,
                    "variant_rejected",
                    &[],
                );
                continue;
            }
            counts.variant_supported_matches += 1;

            if local_counts.get(matched.id).copied().unwrap_or(0) >= max_per_target {
                counts.local_cap_dropped_matches += 1;
                push_trace_sample(
                    &mut samples,
                    &mut sample_counts,
                    sample_limit,
                    &candidate,
                    &matched,
                    "local_cap_dropped",
                    &[],
                );
                continue;
            }
            quality_candidates.push(matched);
        }
        if quality_candidates.is_empty() {
            continue;
        }

        let flags = quality_flags(
            &candidate.sentence,
            &normalized,
            candidate.quality.as_deref(),
        );
        if !keep_sentence(&flags) {
            for matched in quality_candidates {
                counts_by_target
                    .entry(matched.id.to_owned())
                    .or_default()
                    .quality_rejected_matches += 1;
                push_trace_sample(
                    &mut samples,
                    &mut sample_counts,
                    sample_limit,
                    &candidate,
                    &matched,
                    "quality_rejected",
                    &flags,
                );
            }
            continue;
        }

        for matched in quality_candidates {
            *local_counts.entry(matched.id.to_owned()).or_insert(0) += 1;
            counts_by_target
                .entry(matched.id.to_owned())
                .or_default()
                .emitted_matches_before_writer_cap += 1;
            push_trace_sample(
                &mut samples,
                &mut sample_counts,
                sample_limit,
                &candidate,
                &matched,
                "emitted",
                &flags,
            );
        }
    }

    tx.send(TraceEvent::Done(TraceResourceStats {
        resource_id: resource.id,
        candidates_seen,
        empty_candidates,
        duration_ms: started.elapsed().as_millis(),
        counts_by_target,
        samples,
    }))
    .context("send trace resource stats")?;
    Ok(())
}

fn push_trace_sample(
    samples: &mut Vec<TraceSample>,
    sample_counts: &mut HashMap<String, usize>,
    sample_limit: usize,
    candidate: &sources::Candidate,
    matched: &targets::TargetMatch<'_>,
    stage: &str,
    flags: &[String],
) {
    if sample_limit == 0 {
        return;
    }
    let used = sample_counts.get(matched.id).copied().unwrap_or(0);
    if used >= sample_limit {
        return;
    }
    sample_counts.insert(matched.id.to_owned(), used + 1);
    samples.push(TraceSample {
        target_id: matched.id.to_owned(),
        stage: stage.to_owned(),
        resource_id: candidate.resource_id.clone(),
        doc_id: candidate.doc_id.clone(),
        title: candidate.title.clone(),
        url: candidate.url.clone(),
        variant_kind: matched.variant_kind.as_str().to_owned(),
        matched_pattern: matched.matched_pattern.to_owned(),
        flags: flags.to_vec(),
        sentence: candidate.sentence.clone(),
    });
}

fn retained_trace_evidence(
    source_db: &Path,
    targets: &[Target],
) -> Result<HashMap<String, TraceRetainedEvidence>> {
    if !source_db.exists() {
        return Ok(HashMap::new());
    }
    let con = readonly_connection(source_db)?;
    let has_variant_kind = occurrences_has_variant_kind(&con)?;
    let mut retained = HashMap::new();
    for target in targets {
        let row = if has_variant_kind {
            let mut stmt = con.prepare(
                r#"
                SELECT count(o.id), count(DISTINCT s.resource_id),
                       coalesce(group_concat(DISTINCT o.variant_kind), '')
                FROM occurrences o
                JOIN sentences s ON s.id = o.sentence_id
                WHERE o.target_id = ?
                "#,
            )?;
            stmt.query_row([target.id.as_str()], |row| {
                let variants: String = row.get(2)?;
                Ok(TraceRetainedEvidence {
                    retained_occurrences: row.get(0)?,
                    retained_resources: row.get(1)?,
                    retained_variants: variants
                        .split(',')
                        .filter(|part| !part.is_empty())
                        .map(ToOwned::to_owned)
                        .collect(),
                })
            })?
        } else {
            let mut stmt = con.prepare(
                r#"
                SELECT count(o.id), count(DISTINCT s.resource_id)
                FROM occurrences o
                JOIN sentences s ON s.id = o.sentence_id
                WHERE o.target_id = ?
                "#,
            )?;
            stmt.query_row([target.id.as_str()], |row| {
                Ok(TraceRetainedEvidence {
                    retained_occurrences: row.get(0)?,
                    retained_resources: row.get(1)?,
                    retained_variants: Vec::new(),
                })
            })?
        };
        retained.insert(target.id.clone(), row);
    }
    Ok(retained)
}

fn retained_trace_samples(
    source_db: &Path,
    targets: &[Target],
    sample_limit: usize,
) -> Result<HashMap<String, Vec<TraceSample>>> {
    if sample_limit == 0 {
        return Ok(HashMap::new());
    }
    let con = readonly_connection(source_db)?;
    let has_variant_kind = occurrences_has_variant_kind(&con)?;
    let variant_expr = if has_variant_kind {
        "o.variant_kind"
    } else {
        "'canonical'"
    };
    let sql = format!(
        r#"
        SELECT s.resource_id, s.doc_id, s.title, s.url, {variant_expr},
               o.matched_pattern, s.flags_json, s.sentence
        FROM occurrences o
        JOIN sentences s ON s.id = o.sentence_id
        WHERE o.target_id = ?
        ORDER BY o.score DESC, o.id
        LIMIT ?
        "#
    );
    let mut out = HashMap::new();
    for target in targets {
        let mut stmt = con.prepare(&sql)?;
        let rows = stmt.query_map(params![target.id.as_str(), sample_limit as i64], |row| {
            let flags_json: String = row.get(6)?;
            let flags = serde_json::from_str::<Vec<String>>(&flags_json).unwrap_or_default();
            Ok(TraceSample {
                target_id: target.id.clone(),
                stage: "retained".to_owned(),
                resource_id: row.get(0)?,
                doc_id: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                title: row.get(2)?,
                url: row.get(3)?,
                variant_kind: row.get(4)?,
                matched_pattern: row.get(5)?,
                flags,
                sentence: row.get(7)?,
            })
        })?;
        let samples = rows.collect::<rusqlite::Result<Vec<_>>>()?;
        if !samples.is_empty() {
            out.insert(target.id.clone(), samples);
        }
    }
    Ok(out)
}

fn occurrences_has_variant_kind(con: &Connection) -> Result<bool> {
    let mut stmt = con.prepare("PRAGMA table_info(occurrences)")?;
    let columns = stmt.query_map([], |row| row.get::<_, String>(1))?;
    for column in columns {
        if column? == "variant_kind" {
            return Ok(true);
        }
    }
    Ok(false)
}

fn trace_markdown(report: &TraceReport) -> String {
    let mut lines = vec![
        "# Corpus Target Provenance Trace".to_owned(),
        String::new(),
        format!("Generated: {}", report.generated_at),
        String::new(),
        "## Summary".to_owned(),
        String::new(),
        format!("- Selected sources: {}", report.selected_sources),
        format!(
            "- Raw scan performed: {}",
            if report.raw_scan_performed {
                "yes"
            } else {
                "no"
            }
        ),
        format!(
            "- Resource partitions selected: {}",
            report.resource_partitions
        ),
        format!(
            "- Resource partitions skipped by cache inventory: {}",
            report.skipped_resource_partitions
        ),
        format!(
            "- Resource partitions scanned: {}",
            report
                .resource_partitions
                .saturating_sub(report.skipped_resource_partitions)
        ),
        format!("- Candidates scanned: {}", report.candidates_seen),
        format!("- Empty normalized candidates: {}", report.empty_candidates),
        format!("- Duration: {} ms", report.duration_ms),
        format!("- Max per target: {}", report.max_per_target),
        String::new(),
        "## Boundaries".to_owned(),
        String::new(),
    ];
    for boundary in &report.boundaries {
        lines.push(format!("- {boundary}"));
    }
    lines.extend([
        String::new(),
        "## Targets".to_owned(),
        String::new(),
        "| Target | Signature | Raw | Variant Supported | Variant Rejected | Local Partition Cap Dropped | Quality Rejected | Emitted | Retained | Retained Variants |".to_owned(),
        "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |".to_owned(),
    ]);
    for target in &report.targets {
        let raw_pattern_matches = trace_count_cell(report, target.counts.raw_pattern_matches);
        let variant_supported_matches =
            trace_count_cell(report, target.counts.variant_supported_matches);
        let variant_rejected_matches =
            trace_count_cell(report, target.counts.variant_rejected_matches);
        let local_cap_dropped_matches =
            trace_count_cell(report, target.counts.local_cap_dropped_matches);
        let quality_rejected_matches =
            trace_count_cell(report, target.counts.quality_rejected_matches);
        let emitted_matches =
            trace_count_cell(report, target.counts.emitted_matches_before_writer_cap);
        lines.push(format!(
            "| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |",
            md_escape(&target.target_key),
            md_escape(&target.signature),
            raw_pattern_matches,
            variant_supported_matches,
            variant_rejected_matches,
            local_cap_dropped_matches,
            quality_rejected_matches,
            emitted_matches,
            target.retained.retained_occurrences,
            md_escape(&target.retained.retained_variants.join(", ")),
        ));
    }
    lines.extend([String::new(), "## Samples".to_owned(), String::new()]);
    for target in &report.targets {
        if target.samples.is_empty() {
            continue;
        }
        lines.push(format!("### {} ({})", target.target_key, target.signature));
        lines.push(String::new());
        lines.push("| Stage | Variant | Resource | Flags | Sentence |".to_owned());
        lines.push("| --- | --- | --- | --- | --- |".to_owned());
        for sample in &target.samples {
            lines.push(format!(
                "| {} | {} | {} | {} | {} |",
                md_escape(&sample.stage),
                md_escape(&sample.variant_kind),
                md_escape(&sample.resource_id),
                md_escape(&sample.flags.join(", ")),
                md_escape(&sample.sentence),
            ));
        }
        lines.push(String::new());
    }
    lines.join("\n")
}

fn trace_count_cell(report: &TraceReport, value: usize) -> String {
    if report.raw_scan_performed {
        value.to_string()
    } else {
        "n/a".to_owned()
    }
}

pub(crate) fn md_escape(value: &str) -> String {
    value.replace('|', "\\|").replace('\n', " ")
}

fn load_search_index_sentences(path: &Path, limit: usize) -> Result<Vec<SearchIndexSentence>> {
    let con = readonly_connection(path)?;
    let sql = r#"
        SELECT id, resource_id, title, url, domain, sentence, normalized
        FROM sentences
        WHERE normalized <> ''
        ORDER BY id
    "#;
    if limit == 0 {
        let mut stmt = con.prepare(sql)?;
        let rows = stmt.query_map([], search_index_sentence_from_row)?;
        return rows
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into);
    }

    let mut stmt = con.prepare(&format!("{sql} LIMIT ?"))?;
    let rows = stmt.query_map(params![limit.to_string()], search_index_sentence_from_row)?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(Into::into)
}

fn search_index_sentence_from_row(
    row: &rusqlite::Row<'_>,
) -> rusqlite::Result<SearchIndexSentence> {
    Ok(SearchIndexSentence {
        id: row.get(0)?,
        resource_id: row.get(1)?,
        title: row.get(2)?,
        url: row.get(3)?,
        domain: row.get(4)?,
        sentence: row.get(5)?,
        normalized: row.get(6)?,
    })
}

fn load_bench_sentences(path: &Path, limit: usize) -> Result<Vec<BenchSentence>> {
    let con = readonly_connection(path)?;
    let mut stmt = con.prepare(
        "SELECT id, normalized FROM sentences WHERE normalized <> '' ORDER BY id LIMIT ?",
    )?;
    let rows = stmt.query_map(params![limit.to_string()], |row| {
        Ok(BenchSentence {
            id: row.get(0)?,
            normalized: row.get(1)?,
        })
    })?;

    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(Into::into)
}

fn load_bench_queries(path: &Path, limit: usize) -> Result<Vec<BenchQuery>> {
    let con = readonly_connection(path)?;
    let mut stmt = con.prepare(
        r#"
        SELECT t.target_key
        FROM targets t
        JOIN occurrences o ON o.target_id = t.id
        GROUP BY t.target_key
        ORDER BY count(o.id) DESC, length(t.target_key) DESC, t.target_key ASC
        LIMIT ?
        "#,
    )?;
    let rows = stmt.query_map(params![limit.to_string()], |row| {
        Ok(BenchQuery {
            target_key: row.get(0)?,
        })
    })?;

    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(Into::into)
}

fn readonly_connection(path: &Path) -> Result<Connection> {
    Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .with_context(|| format!("open {}", path.display()))
}

fn bench_aho_batch(sentences: &[BenchSentence], queries: &[BenchQuery]) -> Result<BenchResult> {
    let started_index = Instant::now();
    let patterns = queries
        .iter()
        .map(|query| query.target_key.as_str())
        .collect::<Vec<_>>();
    let matcher = AhoCorasick::new(patterns)?;
    let index_ms = started_index.elapsed().as_millis();

    let started_query = Instant::now();
    let mut total_hits = 0usize;
    for sentence in sentences {
        let bytes = sentence.normalized.as_bytes();
        let mut matched_queries = vec![false; queries.len()];
        for matched in matcher.find_overlapping_iter(&sentence.normalized) {
            if !matched_queries[matched.pattern().as_usize()]
                && is_space_boundary(bytes, matched.start())
                && is_space_boundary(bytes, matched.end())
            {
                matched_queries[matched.pattern().as_usize()] = true;
            }
        }
        total_hits += matched_queries
            .into_iter()
            .filter(|matched| *matched)
            .count();
    }

    Ok(BenchResult {
        engine: "rust_aho_corasick_batch".to_owned(),
        status: "benchmarked".to_owned(),
        index_ms,
        query_ms: started_query.elapsed().as_millis(),
        total_hits,
        index_bytes: 0,
        notes: "one-pass batch match over all target phrases; this is the production coverage/indexing shape".to_owned(),
    })
}

fn bench_sqlite_fts(
    out_dir: &Path,
    sentences: &[BenchSentence],
    queries: &[BenchQuery],
) -> Result<BenchResult> {
    let db_path = out_dir.join("sqlite-fts5.sqlite");
    remove_file_if_exists(&db_path)?;
    let con = Connection::open(&db_path)?;

    let started_index = Instant::now();
    con.execute_batch(
        r#"
        PRAGMA journal_mode = OFF;
        PRAGMA synchronous = OFF;
        PRAGMA temp_store = MEMORY;
        CREATE VIRTUAL TABLE sentence_fts USING fts5(
          normalized,
          tokenize='unicode61 remove_diacritics 0'
        );
        BEGIN;
        "#,
    )?;
    {
        let mut insert =
            con.prepare("INSERT INTO sentence_fts(rowid, normalized) VALUES (?, ?)")?;
        for sentence in sentences {
            insert.execute(params![sentence.id, &sentence.normalized])?;
        }
    }
    con.execute_batch("COMMIT;")?;
    let index_ms = started_index.elapsed().as_millis();

    let started_query = Instant::now();
    let mut total_hits = 0usize;
    {
        let mut stmt =
            con.prepare("SELECT count(*) FROM sentence_fts WHERE sentence_fts MATCH ?")?;
        for query in queries {
            let count: usize = stmt.query_row([fts_phrase(&query.target_key)], |row| row.get(0))?;
            total_hits += count;
        }
    }

    Ok(BenchResult {
        engine: "sqlite_fts5".to_owned(),
        status: "benchmarked".to_owned(),
        index_ms,
        query_ms: started_query.elapsed().as_millis(),
        total_hits,
        index_bytes: file_size(&db_path)?,
        notes: "SQLite FTS5 phrase queries over the same normalized sentence sample".to_owned(),
    })
}

fn bench_tantivy(
    out_dir: &Path,
    sentences: &[BenchSentence],
    queries: &[BenchQuery],
) -> Result<BenchResult> {
    let index_path = out_dir.join("tantivy");
    remove_dir_if_exists(&index_path)?;
    fs::create_dir_all(&index_path)?;

    let mut schema_builder = Schema::builder();
    let normalized = schema_builder.add_text_field("normalized", TEXT);
    let schema = schema_builder.build();

    let started_index = Instant::now();
    let index = Index::create_in_dir(&index_path, schema)?;
    let mut writer = index.writer(128_000_000)?;
    for sentence in sentences {
        writer.add_document(doc!(normalized => sentence.normalized.as_str()))?;
    }
    writer.commit()?;
    let index_ms = started_index.elapsed().as_millis();

    let reader = index.reader()?;
    let searcher = reader.searcher();
    let started_query = Instant::now();
    let mut total_hits = 0usize;
    for query in queries {
        let boxed_query = tantivy_phrase_query(normalized, &query.target_key);
        total_hits += searcher.search(&boxed_query, &Count)?;
    }

    Ok(BenchResult {
        engine: "tantivy".to_owned(),
        status: "benchmarked".to_owned(),
        index_ms,
        query_ms: started_query.elapsed().as_millis(),
        total_hits,
        index_bytes: dir_size(&index_path)?,
        notes: "embedded Rust Lucene-like inverted index with phrase queries".to_owned(),
    })
}

fn bench_ripgrep(
    out_dir: &Path,
    sentences: &[BenchSentence],
    queries: &[BenchQuery],
) -> Result<BenchResult> {
    let sample_path = out_dir.join("sample-normalized.txt");
    let queries_path = out_dir.join("queries.txt");
    let started_index = Instant::now();
    fs::write(
        &sample_path,
        sentences
            .iter()
            .map(|sentence| format!("{}\t{}\n", sentence.id, sentence.normalized))
            .collect::<String>(),
    )?;
    fs::write(
        &queries_path,
        queries
            .iter()
            .map(|query| format!("{}\n", query.target_key))
            .collect::<String>(),
    )?;
    let index_ms = started_index.elapsed().as_millis();

    let started_query = Instant::now();
    let output = ProcessCommand::new("rg")
        .arg("--fixed-strings")
        .arg("--count-matches")
        .arg("--file")
        .arg(&queries_path)
        .arg(&sample_path)
        .output();
    let (status, total_hits, notes) = match output {
        Ok(output) if output.status.success() || output.status.code() == Some(1) => {
            let hits = String::from_utf8_lossy(&output.stdout)
                .lines()
                .filter_map(|line| {
                    line.rsplit_once(':')
                        .map(|(_, count)| count)
                        .unwrap_or(line)
                        .parse::<usize>()
                        .ok()
                })
                .sum();
            (
                "benchmarked".to_owned(),
                hits,
                "ripgrep fixed-string scan with all query phrases loaded from a file".to_owned(),
            )
        }
        Ok(output) => (
            "failed".to_owned(),
            0,
            String::from_utf8_lossy(&output.stderr).trim().to_owned(),
        ),
        Err(err) => ("skipped".to_owned(), 0, err.to_string()),
    };

    Ok(BenchResult {
        engine: "ripgrep_fixed_strings".to_owned(),
        status,
        index_ms,
        query_ms: started_query.elapsed().as_millis(),
        total_hits,
        index_bytes: file_size(&sample_path)? + file_size(&queries_path)?,
        notes,
    })
}

pub(crate) fn is_space_boundary(bytes: &[u8], index: usize) -> bool {
    index == 0 || index == bytes.len() || bytes[index - 1] == b' ' || bytes[index] == b' '
}

fn fts_phrase(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn tantivy_phrase_query(field: Field, value: &str) -> Box<dyn Query> {
    let terms = value
        .split_whitespace()
        .map(|token| Term::from_field_text(field, token))
        .collect::<Vec<_>>();
    if terms.len() == 1 {
        Box::new(TermQuery::new(
            terms[0].clone(),
            IndexRecordOption::WithFreqsAndPositions,
        ))
    } else {
        Box::new(PhraseQuery::new(terms))
    }
}

fn doc_text(doc: &TantivyDocument, field: Field) -> Option<String> {
    doc.get_first(field)
        .and_then(|value| value.as_str())
        .map(ToOwned::to_owned)
}

fn doc_u64(doc: &TantivyDocument, field: Field) -> Option<u64> {
    doc.get_first(field).and_then(|value| value.as_u64())
}

fn remove_file_if_exists(path: &Path) -> Result<()> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(err) => Err(err.into()),
    }
}

fn remove_dir_if_exists(path: &Path) -> Result<()> {
    match fs::remove_dir_all(path) {
        Ok(()) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(err) => Err(err.into()),
    }
}

fn file_size(path: &Path) -> Result<u64> {
    Ok(fs::metadata(path)?.len())
}

fn dir_size(path: &Path) -> Result<u64> {
    let mut total = 0u64;
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        if metadata.is_dir() {
            total += dir_size(&entry.path())?;
        } else {
            total += metadata.len();
        }
    }
    Ok(total)
}

pub(crate) fn current_timestamp() -> Result<String> {
    let output = ProcessCommand::new("date")
        .arg("-u")
        .arg("+%Y-%m-%dT%H:%M:%SZ")
        .output()?;
    Ok(String::from_utf8(output.stdout)?.trim().to_owned())
}

fn match_targets(args: MatchArgs) -> Result<()> {
    if args.max_per_target == 0 {
        bail!("--max-per-target must be greater than zero");
    }

    let repo_root = std::env::current_dir().context("read current directory")?;
    let selected_resources = select_resources(&repo_root, &args.sources)?;
    if selected_resources.is_empty() {
        bail!(
            "no matching downloaded resources for --sources={}",
            args.sources
        );
    }
    let mut resources = Vec::new();
    for resource in selected_resources {
        resources.extend(expand_resource_partitions(&resource)?);
    }

    let targets = load_targets(&args.targets)
        .with_context(|| format!("load targets from {}", args.targets.display()))?;
    if targets.is_empty() {
        bail!("no targets in {}", args.targets.display());
    }

    let target_matcher = Arc::new(TargetMatcher::new(targets.clone())?);
    let (tx, rx) = mpsc::channel();
    let started = Instant::now();

    println!(
        "Parallel target scan: {} source partition(s), {} target row(s)",
        resources.len(),
        targets.len()
    );

    let db = ExampleDb::open(&args.out, args.append)
        .with_context(|| format!("open {}", args.out.display()))?;
    db.insert_resources(&resources)?;
    db.insert_targets(&targets)?;
    db.write_index_metadata("parallel_matched_examples", &args.sources)?;

    let mut counts = db.occurrence_counts()?;
    let saturated_targets = Arc::new(RwLock::new(
        counts
            .iter()
            .filter_map(|(id, count)| {
                if *count >= args.max_per_target {
                    Some(id.clone())
                } else {
                    None
                }
            })
            .collect::<HashSet<_>>(),
    ));
    let mut writes_since_commit = 0usize;
    let mut total_sentences = 0usize;
    let mut total_occurrences = 0usize;
    let mut occurrences_by_resource = HashMap::<String, usize>::new();
    let mut errors = Vec::new();

    let jobs = match args.jobs {
        0 => thread::available_parallelism()
            .map(|count| count.get())
            .unwrap_or(4),
        explicit => explicit,
    }
    .clamp(1, resources.len().max(1));
    let work = Arc::new(Mutex::new(
        resources.clone().into_iter().collect::<VecDeque<_>>(),
    ));
    let mut handles = Vec::new();
    for _ in 0..jobs {
        let worker_tx = tx.clone();
        let worker_matcher = Arc::clone(&target_matcher);
        let worker_work = Arc::clone(&work);
        let worker_saturated_targets = Arc::clone(&saturated_targets);
        let max_per_target = args.max_per_target;
        let candidate_cache_dir = args.candidate_cache_dir.clone();
        let require_candidate_cache = args.require_candidate_cache;
        handles.push(thread::spawn(move || loop {
            let Some(resource) = worker_work.lock().expect("work queue").pop_front() else {
                break;
            };
            scan_resource_for_matches(
                resource,
                Arc::clone(&worker_matcher),
                Arc::clone(&worker_saturated_targets),
                max_per_target,
                candidate_cache_dir.clone(),
                require_candidate_cache,
                worker_tx.clone(),
            );
        }));
    }
    drop(tx);

    db.begin()?;
    for event in rx {
        match event {
            MatchEvent::Hit(hit) => {
                let viable = hit
                    .matches
                    .iter()
                    .filter(|matched| {
                        counts.get(&matched.id).copied().unwrap_or(0) < args.max_per_target
                    })
                    .collect::<Vec<_>>();
                if viable.is_empty() {
                    continue;
                }

                let sentence_id =
                    db.insert_sentence(&hit.candidate, &hit.normalized, &hit.flags_json)?;
                total_sentences += 1;
                writes_since_commit += 1;

                for matched in viable {
                    if counts.get(&matched.id).copied().unwrap_or(0) >= args.max_per_target {
                        continue;
                    }
                    let score =
                        score_sentence(&hit.candidate, matched.kind, &hit.flags, &hit.normalized);
                    if db.insert_occurrence(
                        &matched.id,
                        &matched.target_key,
                        &matched.signature,
                        sentence_id,
                        matched.kind.as_str(),
                        matched.variant_kind.as_str(),
                        &matched.matched_pattern,
                        score,
                    )? {
                        *counts.entry(matched.id.clone()).or_insert(0) += 1;
                        if counts.get(&matched.id).copied().unwrap_or(0) >= args.max_per_target {
                            saturated_targets
                                .write()
                                .expect("saturated target set")
                                .insert(matched.id.clone());
                        }
                        *occurrences_by_resource
                            .entry(hit.candidate.resource_id.clone())
                            .or_insert(0) += 1;
                        total_occurrences += 1;
                        writes_since_commit += 1;
                    }
                }
            }
            MatchEvent::Done(stats) => {
                db.write_resource_stats(
                    &stats.resource_id,
                    stats.candidates_seen,
                    stats.sentences_inserted,
                    0,
                    occurrences_by_resource
                        .remove(&stats.resource_id)
                        .unwrap_or(0),
                    stats.empty_candidates,
                    stats.quality_rejected,
                    stats.unmatched_rejected,
                    stats.duration_ms,
                )?;
                println!(
                    "  {}: {} candidates, {} hit sentence(s) in {:.1}s",
                    stats.resource_id,
                    stats.candidates_seen,
                    stats.sentences_inserted,
                    stats.duration_ms as f64 / 1000.0
                );
                writes_since_commit += 1;
            }
            MatchEvent::Error(err) => errors.push(err),
        }

        if writes_since_commit >= COMMIT_EVERY_WRITES {
            db.commit()?;
            db.begin()?;
            writes_since_commit = 0;
        }
    }
    db.commit()?;

    for handle in handles {
        if handle.join().is_err() {
            errors.push("worker thread panicked".to_owned());
        }
    }
    if !errors.is_empty() {
        bail!("{}", errors.join("\n"));
    }

    let (sentence_count, occurrence_count) = db.write_counts()?;
    println!(
        "Wrote {} with {sentence_count} stored sentence(s), {occurrence_count} occurrence(s); new run inserted {total_sentences} sentence(s), {total_occurrences} occurrence(s) in {:.1}s",
        args.out.display(),
        started.elapsed().as_secs_f64()
    );
    Ok(())
}

fn build_candidate_cache(args: BuildCandidateCacheArgs) -> Result<()> {
    let repo_root = std::env::current_dir().context("read current directory")?;
    let selected_resources = select_resources(&repo_root, &args.sources)?;
    if selected_resources.is_empty() {
        bail!(
            "no matching downloaded resources for --sources={}",
            args.sources
        );
    }
    let mut resources = Vec::new();
    for resource in selected_resources {
        resources.extend(expand_resource_partitions(&resource)?);
    }
    let targets = load_targets(&args.targets)
        .with_context(|| format!("load targets from {}", args.targets.display()))?;
    if targets.is_empty() {
        bail!("no targets in {}", args.targets.display());
    }
    let target_count = targets.len();
    let target_matcher = Arc::new(TargetMatcher::new_with_anchor_prefilter(targets)?);

    println!(
        "Building candidate cache: {} source partition(s), {} target row(s) -> {}",
        resources.len(),
        target_count,
        args.cache_dir.display()
    );

    let jobs = match args.jobs {
        0 => thread::available_parallelism()
            .map(|count| count.get())
            .unwrap_or(4),
        explicit => explicit,
    }
    .clamp(1, resources.len().max(1));
    let work = Arc::new(Mutex::new(resources.into_iter().collect::<VecDeque<_>>()));
    let (tx, rx) = mpsc::channel::<Result<CacheBuildStats>>();
    let mut handles = Vec::new();
    let started = Instant::now();

    for _ in 0..jobs {
        let worker_work = Arc::clone(&work);
        let worker_tx = tx.clone();
        let cache_dir = args.cache_dir.clone();
        let targets_path = args.targets.clone();
        let worker_matcher = Arc::clone(&target_matcher);
        let refresh = args.refresh;
        handles.push(thread::spawn(move || loop {
            let Some(resource) = worker_work.lock().expect("work queue").pop_front() else {
                break;
            };
            let result = build_resource_cache(
                &resource,
                &cache_dir,
                refresh,
                Some(worker_matcher.as_ref()),
                Some(&targets_path),
            )
            .with_context(|| format!("build candidate cache for {}", resource.id));
            if worker_tx.send(result).is_err() {
                break;
            }
        }));
    }
    drop(tx);

    let mut partitions = 0usize;
    let mut candidates = 0usize;
    let mut empty = 0usize;
    let mut errors = Vec::new();
    for event in rx {
        match event {
            Ok(stats) => {
                partitions += 1;
                candidates += stats.candidates_seen;
                empty += stats.empty_candidates;
                println!(
                    "  {}: {} candidates, {} empty normalized",
                    stats.resource_id, stats.candidates_seen, stats.empty_candidates
                );
            }
            Err(err) => errors.push(format!("{err:#}")),
        }
    }

    for handle in handles {
        if handle.join().is_err() {
            errors.push("worker thread panicked".to_owned());
        }
    }
    if !errors.is_empty() {
        bail!("{}", errors.join("\n"));
    }

    println!(
        "Cached {candidates} candidate(s) from {partitions} partition(s), {empty} empty normalized in {:.1}s",
        started.elapsed().as_secs_f64()
    );
    Ok(())
}

fn scan_resource_for_matches(
    resource: ResourceSpec,
    target_matcher: Arc<TargetMatcher>,
    saturated_targets: Arc<RwLock<HashSet<String>>>,
    max_per_target: usize,
    candidate_cache_dir: Option<PathBuf>,
    require_candidate_cache: bool,
    tx: mpsc::Sender<MatchEvent>,
) {
    let resource_id = resource.id.clone();
    if let Err(err) = scan_resource_for_matches_inner(
        resource,
        target_matcher,
        saturated_targets,
        max_per_target,
        candidate_cache_dir,
        require_candidate_cache,
        &tx,
    ) {
        let _ = tx.send(MatchEvent::Error(format!("{resource_id}: {err:#}")));
    }
}

fn scan_resource_for_matches_inner(
    resource: ResourceSpec,
    target_matcher: Arc<TargetMatcher>,
    saturated_targets: Arc<RwLock<HashSet<String>>>,
    max_per_target: usize,
    candidate_cache_dir: Option<PathBuf>,
    require_candidate_cache: bool,
    tx: &mpsc::Sender<MatchEvent>,
) -> Result<()> {
    let started = Instant::now();
    let mut candidates_seen = 0usize;
    let mut hit_sentences = 0usize;
    let mut empty_candidates = 0usize;
    let mut quality_rejected = 0usize;
    let mut unmatched_rejected = 0usize;
    let mut local_counts = HashMap::<String, usize>::new();
    let mut stream = open_candidate_stream(
        &resource,
        candidate_cache_dir.as_deref(),
        require_candidate_cache,
    )
    .with_context(|| format!("open candidates for {}", resource.id))?;

    while let Some(item) = stream.next_normalized() {
        let cached = item.with_context(|| format!("read source {}", resource.id))?;
        let normalized = cached.normalized;
        candidates_seen += 1;
        if candidates_seen.is_multiple_of(1_000_000) {
            println!(
                "  {}: {candidates_seen} candidates, {hit_sentences} hit sentence(s)",
                resource.id
            );
        }

        if normalized.is_empty() {
            empty_candidates += 1;
            continue;
        }
        let raw_matches = target_matcher.matches_normalized(&normalized);
        if raw_matches.is_empty() {
            unmatched_rejected += 1;
            continue;
        }

        let candidate = stream.current_candidate()?;
        let saturated = saturated_targets.read().expect("saturated target set");
        let matches = raw_matches
            .into_iter()
            .filter(|matched| !saturated.contains(matched.id))
            .filter(|matched| {
                variant_supported_by_raw_sentence(matched.variant_kind, &candidate.sentence)
            })
            .filter(|matched| local_counts.get(matched.id).copied().unwrap_or(0) < max_per_target)
            .map(|matched| OwnedMatch {
                id: matched.id.to_owned(),
                target_key: matched.target_key.to_owned(),
                signature: matched.signature.to_owned(),
                kind: matched.kind,
                variant_kind: matched.variant_kind,
                matched_pattern: matched.matched_pattern.to_owned(),
            })
            .collect::<Vec<_>>();
        drop(saturated);

        if matches.is_empty() {
            unmatched_rejected += 1;
            continue;
        }

        let flags = quality_flags(
            &candidate.sentence,
            &normalized,
            candidate.quality.as_deref(),
        );
        if !keep_sentence(&flags) {
            quality_rejected += 1;
            continue;
        }

        for matched in &matches {
            *local_counts.entry(matched.id.clone()).or_insert(0) += 1;
        }
        let flags_json = serde_json::to_string(&flags)?;
        tx.send(MatchEvent::Hit(Hit {
            candidate,
            normalized,
            flags,
            flags_json,
            matches,
        }))
        .context("send matched sentence")?;
        hit_sentences += 1;
    }

    tx.send(MatchEvent::Done(ResourceStats {
        resource_id: resource.id,
        candidates_seen,
        sentences_inserted: hit_sentences,
        empty_candidates,
        quality_rejected,
        unmatched_rejected,
        duration_ms: started.elapsed().as_millis(),
    }))
    .context("send resource stats")?;
    Ok(())
}

fn variant_supported_by_raw_sentence(variant_kind: VariantKind, sentence: &str) -> bool {
    match variant_kind {
        VariantKind::SNegative => has_apostrophe_negation(sentence),
        _ => true,
    }
}

fn has_apostrophe_negation(sentence: &str) -> bool {
    sentence.contains("s'")
        || sentence.contains("S'")
        || sentence.contains("s’")
        || sentence.contains("S’")
}

fn select_resources(repo_root: &Path, raw_sources: &str) -> Result<Vec<ResourceSpec>> {
    let wanted = source_ids(raw_sources);
    let by_id = load_downloaded_resources(repo_root)?
        .into_iter()
        .map(|resource| (resource.id.clone(), resource))
        .collect::<HashMap<_, _>>();

    let mut selected = Vec::new();
    for id in wanted {
        match by_id.get(&id) {
            Some(resource) if resource.local_path.exists() => selected.push(resource.clone()),
            Some(resource) => eprintln!(
                "Skipping missing resource {} at {}",
                resource.id,
                resource.local_path.display()
            ),
            None => eprintln!("Skipping unknown resource {id}"),
        }
    }
    Ok(selected)
}

#[cfg(test)]
mod tests {
    use super::has_apostrophe_negation;

    #[test]
    fn apostrophe_negation_does_not_treat_suffix_s_as_negation() {
        assert!(has_apostrophe_negation("Unë s'punoj sot."));
        assert!(has_apostrophe_negation("Ai S’punon sot."));
        assert!(!has_apostrophe_negation("NATO-s dhe UNESCO-s."));
    }
}

fn source_ids(raw_sources: &str) -> Vec<String> {
    if raw_sources == "all" {
        return ALL_SOURCE_IDS.iter().map(|id| (*id).to_owned()).collect();
    }
    raw_sources
        .split(',')
        .filter_map(|raw| {
            let key = raw.trim();
            if key.is_empty() {
                None
            } else {
                Some(alias_source(key).to_owned())
            }
        })
        .collect()
}

fn alias_source(source: &str) -> &str {
    match source {
        "macocu-xml" => "macocu-sq-1.0-xml",
        "macocu-genre" => "macocu-genre-sq",
        "cc100" => "cc100-sq",
        "hplt" => "hplt-v3-als-latn",
        "leipzig" => "leipzig-sqi",
        "mc4" => "mc4-sq",
        "hf-wiki" => "hf-albanian-wiki-clean-lm",
        "hf-en-sq" => "hf-albanian-english-bundled",
        "hf-bigmind" => "hf-bigmind-albanian",
        "hf-wikiorca" => "hf-albanian-wikiorca",
        "fineweb2" => "fineweb2-albanian-varieties",
        "culturax" => "culturax-sq",
        "wikimedia" => "wikimedia-sq-latest",
        "seeuniversity" => "seeuniversity-albanian-corpora-bert",
        "opus" => "opus-en-sq-moses-latest",
        "opus-all-to-sq" => "opus-all-to-sq-moses-latest",
        "opus-all" => "opus-all-to-sq-moses-latest",
        "tatoeba" => "tatoeba-full",
        "ud-staf" => "ud-albanian-staf",
        "ud-tsa" => "ud-albanian-tsa",
        other => other,
    }
}

fn score_sentence(
    candidate: &sources::Candidate,
    match_kind: MatchKind,
    flags: &[String],
    normalized: &str,
) -> i64 {
    let mut score = match match_kind {
        MatchKind::ExactPhrase => 100,
        MatchKind::ExactToken => 78,
    };
    score += source_bonus(&candidate.resource_id);
    match candidate.quality.as_deref() {
        Some("good") => score += 10,
        Some("neargood") => score += 6,
        _ => {}
    }
    if candidate.url.is_some() {
        score += 4;
    }
    if candidate.domain.is_some() {
        score += 2;
    }
    if flags.iter().any(|flag| flag == "reference_prose") {
        score -= 30;
    }
    if flags.iter().any(|flag| flag == "low_quality") {
        score -= 12;
    }
    let token_count = normalized.split_whitespace().count();
    if (7..=28).contains(&token_count) {
        score += 8;
    } else if token_count > 45 {
        score -= 8;
    }
    score
}

fn source_bonus(resource_id: &str) -> i64 {
    let resource_id = resource_id.split('#').next().unwrap_or(resource_id);
    match resource_id {
        "macocu-sq-1.0-xml" => 18,
        "macocu-genre-sq" => 15,
        "ud-albanian-staf" | "ud-albanian-tsa" => 12,
        "hplt-v3-als-latn" => 10,
        "fineweb2-albanian-varieties" => 10,
        "leipzig-sqi" => 9,
        "wikimedia-sq-latest" => 9,
        "opus-en-sq-moses-latest" | "opus-all-to-sq-moses-latest" => 8,
        "hf-albanian-wiki-clean-lm"
        | "hf-albanian-english-bundled"
        | "hf-bigmind-albanian"
        | "hf-albanian-wikiorca" => 6,
        "mc4-sq" => 5,
        "seeuniversity-albanian-corpora-bert" => 4,
        "tatoeba-full" => 4,
        "cc100-sq" => 0,
        _ => 0,
    }
}
