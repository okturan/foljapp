mod db;
mod quality;
mod sources;
mod targets;
mod text;

use aho_corasick::AhoCorasick;
use anyhow::{bail, Context, Result};
use clap::{Args, Parser, Subcommand};
use db::ExampleDb;
use quality::{keep_sentence, quality_flags};
use rusqlite::{params, Connection, OpenFlags};
use serde::Serialize;
use sources::{expand_resource_partitions, load_downloaded_resources, open_resource, ResourceSpec};
use std::collections::{HashMap, VecDeque};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command as ProcessCommand;
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::Instant;
use tantivy::collector::{Count, TopDocs};
use tantivy::query::{PhraseQuery, Query, TermQuery};
use tantivy::schema::{
    Field, IndexRecordOption, Schema, TantivyDocument, Value, INDEXED, STORED, STRING, TEXT,
};
use tantivy::{doc, Index, Term};
use targets::{load_targets, MatchKind, TargetMatcher, VariantKind};
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
    Bench(BenchArgs),
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
        Command::Bench(args) => bench(args),
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
    let (top_docs, total_hits) =
        searcher.search(&*query, &(TopDocs::with_limit(args.limit), Count))?;
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
        total_hits += searcher.search(&boxed_query, &Count)? as usize;
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

fn is_space_boundary(bytes: &[u8], index: usize) -> bool {
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

fn current_timestamp() -> Result<String> {
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
        let max_per_target = args.max_per_target;
        handles.push(thread::spawn(move || loop {
            let Some(resource) = worker_work.lock().expect("work queue").pop_front() else {
                break;
            };
            scan_resource_for_matches(
                resource,
                Arc::clone(&worker_matcher),
                max_per_target,
                worker_tx.clone(),
            );
        }));
    }
    drop(tx);

    let db = ExampleDb::open(&args.out, args.append)
        .with_context(|| format!("open {}", args.out.display()))?;
    db.insert_resources(&resources)?;
    db.insert_targets(&targets)?;
    db.write_index_metadata("parallel_matched_examples", &args.sources)?;

    let mut counts = db.occurrence_counts()?;
    let mut writes_since_commit = 0usize;
    let mut total_sentences = 0usize;
    let mut total_occurrences = 0usize;
    let mut errors = Vec::new();

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
                    0,
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

fn scan_resource_for_matches(
    resource: ResourceSpec,
    target_matcher: Arc<TargetMatcher>,
    max_per_target: usize,
    tx: mpsc::Sender<MatchEvent>,
) {
    let resource_id = resource.id.clone();
    if let Err(err) = scan_resource_for_matches_inner(resource, target_matcher, max_per_target, &tx)
    {
        let _ = tx.send(MatchEvent::Error(format!("{resource_id}: {err:#}")));
    }
}

fn scan_resource_for_matches_inner(
    resource: ResourceSpec,
    target_matcher: Arc<TargetMatcher>,
    max_per_target: usize,
    tx: &mpsc::Sender<MatchEvent>,
) -> Result<()> {
    let started = Instant::now();
    let mut candidates_seen = 0usize;
    let mut hit_sentences = 0usize;
    let mut empty_candidates = 0usize;
    let mut quality_rejected = 0usize;
    let mut unmatched_rejected = 0usize;
    let mut local_counts = HashMap::<String, usize>::new();
    let stream =
        open_resource(&resource).with_context(|| format!("open source {}", resource.id))?;

    for item in stream {
        let candidate = item.with_context(|| format!("read source {}", resource.id))?;
        candidates_seen += 1;
        if candidates_seen.is_multiple_of(1_000_000) {
            println!(
                "  {}: {candidates_seen} candidates, {hit_sentences} hit sentence(s)",
                resource.id
            );
        }

        let normalized = normalized_text(&candidate.sentence);
        if normalized.is_empty() {
            empty_candidates += 1;
            continue;
        }
        let matches = target_matcher
            .matches_normalized(&normalized)
            .into_iter()
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
