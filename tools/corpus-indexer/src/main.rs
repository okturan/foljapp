mod db;
mod quality;
mod sources;
mod targets;
mod text;

use anyhow::{bail, Context, Result};
use clap::{Args, Parser, Subcommand};
use db::ExampleDb;
use quality::{keep_sentence, quality_flags};
use sources::{load_downloaded_resources, open_resource, ResourceSpec};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::time::Instant;
use targets::{load_targets, MatchKind, TargetIndex};
use text::tokens_for;

const ALL_SOURCE_IDS: &[&str] = &[
    "macocu-genre-sq",
    "macocu-sq-1.0-xml",
    "cc100-sq",
    "seeuniversity-albanian-corpora-bert",
    "ud-albanian-staf",
    "ud-albanian-tsa",
    "opus-en-sq-moses-latest",
];

#[derive(Parser)]
#[command(author, version, about)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    Scan(ScanArgs),
}

#[derive(Args)]
struct ScanArgs {
    #[arg(long, default_value = ".cache/corpus-example-targets.json")]
    targets: PathBuf,
    #[arg(long, default_value = ".cache/corpus-examples.sqlite")]
    out: PathBuf,
    #[arg(long, default_value = "macocu-xml,macocu-genre")]
    sources: String,
    #[arg(long, default_value_t = 8)]
    max_per_target: usize,
    #[arg(long, default_value_t = 0)]
    max_sentences_per_source: usize,
    #[arg(long)]
    stop_when_satisfied: bool,
    #[arg(long)]
    matched_only: bool,
    #[arg(long)]
    append: bool,
    #[arg(long)]
    sentences_only: bool,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Command::Scan(args) => scan(args),
    }
}

fn scan(args: ScanArgs) -> Result<()> {
    if args.sentences_only && args.matched_only {
        bail!("--matched-only requires targets; omit --sentences-only");
    }

    let repo_root = std::env::current_dir().context("read current directory")?;
    let mut resources = select_resources(&repo_root, &args.sources)?;
    if resources.is_empty() {
        bail!(
            "no matching downloaded resources for --sources={}",
            args.sources
        );
    }

    let targets = if args.sentences_only {
        Vec::new()
    } else {
        load_targets(&args.targets)
            .with_context(|| format!("load targets from {}", args.targets.display()))?
    };
    if !args.sentences_only && targets.is_empty() {
        bail!("no targets in {}", args.targets.display());
    }

    let target_index = TargetIndex::new(targets.clone());
    let db = ExampleDb::open(&args.out, args.append)
        .with_context(|| format!("open {}", args.out.display()))?;
    db.insert_resources(&resources)?;
    db.insert_targets(&targets)?;
    let mut counts = db.occurrence_counts()?;
    let target_ids = targets
        .iter()
        .map(|target| target.id.clone())
        .collect::<HashSet<_>>();

    let started = Instant::now();
    let mut total_sentences = 0usize;
    let mut total_occurrences = 0usize;

    for resource in resources.drain(..) {
        let source_started = Instant::now();
        let mut raw_seen = 0usize;
        let mut stored_for_source = 0usize;
        println!("Scanning {}...", resource.id);
        db.begin()?;
        let stream =
            open_resource(&resource).with_context(|| format!("open source {}", resource.id))?;
        for item in stream {
            let candidate = item.with_context(|| format!("read source {}", resource.id))?;
            raw_seen += 1;
            if raw_seen.is_multiple_of(100_000) {
                println!(
                    "  {raw_seen} candidates, {stored_for_source} stored, {total_occurrences} occurrences",
                );
            }

            let tokens = tokens_for(&candidate.sentence);
            if tokens.is_empty() {
                continue;
            }
            let normalized = tokens.join(" ");
            let flags = quality_flags(
                &candidate.sentence,
                &normalized,
                candidate.quality.as_deref(),
            );
            if !keep_sentence(&flags) {
                continue;
            }

            let matches = if args.sentences_only {
                Vec::new()
            } else {
                target_index.matches_tokens(&tokens)
            };
            let viable = matches
                .into_iter()
                .filter(|matched| {
                    counts.get(matched.id).copied().unwrap_or(0) < args.max_per_target
                })
                .collect::<Vec<_>>();
            if args.matched_only && viable.is_empty() {
                continue;
            }

            let flags_json = serde_json::to_string(&flags)?;
            let Some(sentence_id) = db.insert_sentence(&candidate, &normalized, &flags_json)?
            else {
                continue;
            };
            stored_for_source += 1;
            total_sentences += 1;

            for matched in viable {
                if counts.get(matched.id).copied().unwrap_or(0) >= args.max_per_target {
                    continue;
                }
                let score = score_sentence(&candidate, matched.kind, &flags, &normalized);
                if db.insert_occurrence(
                    matched.id,
                    matched.target_key,
                    matched.signature,
                    sentence_id,
                    matched.kind.as_str(),
                    score,
                )? {
                    *counts.entry(matched.id.to_owned()).or_insert(0) += 1;
                    total_occurrences += 1;
                }
            }

            if args.max_sentences_per_source > 0
                && stored_for_source >= args.max_sentences_per_source
            {
                break;
            }
            if args.stop_when_satisfied
                && !args.sentences_only
                && all_satisfied(&counts, &target_ids, args.max_per_target)
            {
                break;
            }
        }
        db.commit()?;
        println!(
            "  stored {stored_for_source} sentence(s) from {} in {:.1}s",
            resource.id,
            source_started.elapsed().as_secs_f64()
        );
    }

    let (sentence_count, occurrence_count) = db.write_counts()?;
    println!(
        "Wrote {} with {sentence_count} sentence(s) and {occurrence_count} occurrence(s) in {:.1}s",
        args.out.display(),
        started.elapsed().as_secs_f64()
    );
    if total_sentences == 0 && !args.sentences_only {
        println!("No matching sentences were stored.");
    }
    Ok(())
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
        "seeuniversity" => "seeuniversity-albanian-corpora-bert",
        "opus" => "opus-en-sq-moses-latest",
        "ud-staf" => "ud-albanian-staf",
        "ud-tsa" => "ud-albanian-tsa",
        other => other,
    }
}

fn all_satisfied(
    counts: &HashMap<String, usize>,
    target_ids: &HashSet<String>,
    max_per_target: usize,
) -> bool {
    target_ids
        .iter()
        .all(|id| counts.get(id).copied().unwrap_or(0) >= max_per_target)
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
    match resource_id {
        "macocu-sq-1.0-xml" => 18,
        "macocu-genre-sq" => 15,
        "ud-albanian-staf" | "ud-albanian-tsa" => 12,
        "opus-en-sq-moses-latest" => 8,
        "seeuniversity-albanian-corpora-bert" => 4,
        "cc100-sq" => 0,
        _ => 0,
    }
}
