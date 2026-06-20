use crate::candidate_cache::{
    cached_resource_may_contain_any_token, cached_resource_token_hits, open_candidate_stream,
    open_or_build_anchor_row_stream,
};
use crate::sources::ResourceSpec;
use crate::text::normalized_text;
use crate::{
    all_downloaded_partitions, current_timestamp, is_space_boundary, md_escape, split_csv,
};
use aho_corasick::AhoCorasick;
use anyhow::{bail, Context, Result};
use clap::Args;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet, VecDeque};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::Instant;

#[derive(Args)]
pub(crate) struct PhraseVariantStressArgs {
    #[arg(long, default_value = ".cache/corpus-missing-audit.json")]
    audit: PathBuf,
    #[arg(long, default_value = ".cache/corpus-candidate-shards/split-20260620")]
    candidate_cache_dir: PathBuf,
    #[arg(long, default_value = ".cache/corpus-phrase-variant-stress.json")]
    out_json: PathBuf,
    #[arg(long, default_value = ".cache/corpus-phrase-variant-stress.md")]
    out_md: PathBuf,
    #[arg(
        long,
        conflicts_with = "all_targets",
        help = "Limit ranked unfiltered reports; defaults to 200 unless --all-targets or explicit forms/ids are used"
    )]
    limit_targets: Option<usize>,
    #[arg(long)]
    all_targets: bool,
    #[arg(long, default_value_t = 3)]
    sample_limit: usize,
    #[arg(long, default_value_t = 12)]
    jobs: usize,
    #[arg(long, default_value = "")]
    forms: String,
    #[arg(long, default_value = "")]
    target_ids: String,
    #[arg(long)]
    build_anchor_rows: bool,
    #[arg(long, conflicts_with = "build_anchor_rows")]
    plan_only: bool,
}

#[derive(Debug, Deserialize)]
struct MissingAuditFile {
    generated_at: Option<String>,
    summary: HashMap<String, serde_json::Value>,
    misses: Vec<StressAuditMiss>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StressAuditMiss {
    id: String,
    target_key: String,
    verb_id: String,
    lemma: String,
    signature: String,
    token_count: usize,
    primary: String,
    trace_status: Option<String>,
    morphology_form: Option<String>,
    morphology_scope: Option<String>,
    morphology_proof_level: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
struct StressTarget {
    id: String,
    target_key: String,
    verb_id: String,
    lemma: String,
    signature: String,
    primary: String,
    morphology_form: Option<String>,
    morphology_scope: Option<String>,
    morphology_proof_level: Option<String>,
    tokens: Vec<String>,
    anchor: String,
    anchor_partitions: usize,
}

#[derive(Debug, Clone, Serialize)]
struct StressPattern {
    target_index: usize,
    target_id: String,
    kind: String,
    pattern: String,
    anchor: String,
}

struct PhraseStressMatcher {
    automaton: AhoCorasick,
    pattern_indexes_by_automaton: Vec<Vec<usize>>,
    pattern_rows: Vec<StressPattern>,
    anchor_tokens: HashSet<String>,
}

#[derive(Debug)]
struct PhraseStressResourceStats {
    resource_id: String,
    used_anchor_rows: bool,
    source_candidates_seen: usize,
    candidates_seen: usize,
    empty_candidates: usize,
    duration_ms: u128,
    matches_by_pattern: Vec<usize>,
    samples: Vec<PhraseStressSample>,
}

#[derive(Debug)]
enum PhraseStressEvent {
    Done(PhraseStressResourceStats),
    Error(String),
}

#[derive(Debug, Clone, Serialize)]
struct PhraseStressSample {
    target_id: String,
    kind: String,
    pattern: String,
    resource_id: String,
    doc_id: String,
    title: Option<String>,
    url: Option<String>,
    sentence: String,
}

#[derive(Debug, Serialize)]
struct PhraseVariantStressReport {
    generated_at: String,
    audit_path: String,
    audit_generated_at: Option<String>,
    candidate_cache_dir: String,
    summary: PhraseVariantStressSummary,
    pattern_kind_counts: Vec<PhraseVariantStressKind>,
    targets: Vec<PhraseVariantStressTarget>,
    resource_stats: Vec<PhraseVariantStressResource>,
    samples: Vec<PhraseStressSample>,
}

#[derive(Debug, Serialize)]
struct PhraseVariantStressKind {
    key: String,
    patterns: usize,
    raw_matches: usize,
}

#[derive(Debug, Serialize)]
struct PhraseVariantStressSummary {
    plan_only: bool,
    audit_total_targets: Option<usize>,
    selected_targets: usize,
    reported_targets: usize,
    stress_patterns: usize,
    reported_target_patterns: usize,
    anchor_tokens: usize,
    matched_targets: usize,
    matched_patterns: usize,
    raw_matches: usize,
    source_partitions: usize,
    skipped_partitions: usize,
    scanned_partitions: usize,
    existing_anchor_row_partitions: usize,
    missing_anchor_row_partitions: usize,
    candidates_seen: usize,
    anchor_candidates_seen: usize,
    empty_candidates: usize,
    duration_ms: u128,
}

#[derive(Debug, Serialize)]
struct PhraseVariantStressTarget {
    id: String,
    target_key: String,
    lemma: String,
    signature: String,
    primary: String,
    morphology_form: Option<String>,
    morphology_scope: Option<String>,
    anchor: String,
    anchor_partitions: usize,
    patterns: Vec<PhraseVariantStressPattern>,
    matched: bool,
    raw_matches: usize,
}

#[derive(Debug, Clone, Serialize)]
struct PhraseVariantStressPattern {
    kind: String,
    pattern: String,
    raw_matches: usize,
}

#[derive(Debug, Serialize)]
struct PhraseVariantStressResource {
    resource_id: String,
    used_anchor_rows: bool,
    source_candidates_seen: usize,
    candidates_seen: usize,
    empty_candidates: usize,
    duration_ms: u128,
}

struct PhraseStressPlan {
    existing_resource_stats: Vec<PhraseStressResourceStats>,
    missing_anchor_row_partitions: usize,
}

pub(crate) fn phrase_variant_stress(args: PhraseVariantStressArgs) -> Result<()> {
    if args.limit_targets == Some(0) {
        bail!("--limit-targets must be greater than zero");
    }
    let started = Instant::now();
    let audit_raw = fs::read_to_string(&args.audit)
        .with_context(|| format!("read {}", args.audit.display()))?;
    let audit: MissingAuditFile = serde_json::from_str(&audit_raw)?;
    let repo_root = std::env::current_dir().context("read current directory")?;
    let resources = all_downloaded_partitions(&repo_root)?;
    let candidates = phrase_stress_candidates(&audit.misses, &args)?;
    let candidate_anchors = candidates
        .iter()
        .filter_map(stress_target_anchor)
        .collect::<HashSet<_>>();
    let anchor_counts =
        anchor_partition_counts(&resources, &args.candidate_cache_dir, &candidate_anchors)?;
    let selected = select_phrase_stress_targets(candidates, &args, &anchor_counts);
    if selected.is_empty() {
        bail!("no raw-zero multiword targets selected for phrase-variant stress");
    }
    let pattern_rows = build_phrase_stress_patterns(&selected);
    if pattern_rows.is_empty() {
        bail!("selected targets produced no stress patterns");
    }
    let matcher = Arc::new(PhraseStressMatcher::new(pattern_rows)?);
    let source_partitions = resources.len();
    let (scan_resources, skipped_partitions) =
        phrase_stress_scan_resources(resources, &args.candidate_cache_dir, &matcher.anchor_tokens)?;
    if args.plan_only {
        let plan = phrase_stress_plan_resource_stats(
            &scan_resources,
            &args.candidate_cache_dir,
            &matcher.anchor_tokens,
        )?;
        let report = build_phrase_variant_stress_report(
            &args,
            &audit,
            &selected,
            &matcher.pattern_rows,
            &vec![0usize; matcher.pattern_rows.len()],
            plan.existing_resource_stats,
            Vec::new(),
            source_partitions,
            skipped_partitions,
            plan.missing_anchor_row_partitions,
            started.elapsed().as_millis(),
        )?;
        write_phrase_variant_stress_report(&report, &args.out_json, &args.out_md)?;
        println!(
            "Wrote {} and {}: plan for {} target(s), {} stress pattern(s), {} missing anchor-row partition(s)",
            args.out_json.display(),
            args.out_md.display(),
            report.summary.selected_targets,
            report.summary.stress_patterns,
            report.summary.missing_anchor_row_partitions
        );
        return Ok(());
    }

    let jobs = args.jobs.clamp(1, scan_resources.len().max(1));
    let work = Arc::new(Mutex::new(
        scan_resources.into_iter().collect::<VecDeque<_>>(),
    ));
    let (tx, rx) = mpsc::channel::<PhraseStressEvent>();
    let mut handles = Vec::new();
    for _ in 0..jobs {
        let worker_work = Arc::clone(&work);
        let worker_matcher = Arc::clone(&matcher);
        let worker_cache_dir = args.candidate_cache_dir.clone();
        let worker_tx = tx.clone();
        let sample_limit = args.sample_limit;
        let build_anchor_rows = args.build_anchor_rows;
        handles.push(thread::spawn(move || loop {
            let resource = {
                let mut guard = worker_work.lock().expect("work mutex");
                guard.pop_front()
            };
            let Some(resource) = resource else {
                break;
            };
            phrase_stress_resource(
                resource,
                Arc::clone(&worker_matcher),
                worker_cache_dir.clone(),
                sample_limit,
                build_anchor_rows,
                worker_tx.clone(),
            );
        }));
    }
    drop(tx);

    let mut errors = Vec::new();
    let mut resource_stats = Vec::new();
    let mut matches_by_pattern = vec![0usize; matcher.pattern_rows.len()];
    let mut samples = Vec::new();
    while let Ok(event) = rx.recv() {
        match event {
            PhraseStressEvent::Done(stats) => {
                for (index, count) in stats.matches_by_pattern.iter().copied().enumerate() {
                    matches_by_pattern[index] += count;
                }
                samples.extend(stats.samples.clone());
                resource_stats.push(stats);
            }
            PhraseStressEvent::Error(err) => errors.push(err),
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

    let report = build_phrase_variant_stress_report(
        &args,
        &audit,
        &selected,
        &matcher.pattern_rows,
        &matches_by_pattern,
        resource_stats,
        samples,
        source_partitions,
        skipped_partitions,
        0,
        started.elapsed().as_millis(),
    )?;
    write_phrase_variant_stress_report(&report, &args.out_json, &args.out_md)?;
    println!(
        "Wrote {} and {}: {} target(s), {} stress pattern(s), {} raw match(es)",
        args.out_json.display(),
        args.out_md.display(),
        report.summary.selected_targets,
        report.summary.stress_patterns,
        report.summary.raw_matches
    );
    Ok(())
}

fn phrase_stress_scan_resources(
    resources: Vec<ResourceSpec>,
    candidate_cache_dir: &Path,
    anchor_tokens: &HashSet<String>,
) -> Result<(Vec<ResourceSpec>, usize)> {
    let mut skipped_partitions = 0usize;
    let mut scan_resources = Vec::new();
    for resource in resources {
        match cached_resource_may_contain_any_token(&resource, candidate_cache_dir, anchor_tokens)?
        {
            Some(false) => skipped_partitions += 1,
            Some(true) => scan_resources.push(resource),
            None => bail!(
                "missing or stale split cache/token inventory for {} in {}",
                resource.id,
                candidate_cache_dir.display()
            ),
        }
    }
    Ok((scan_resources, skipped_partitions))
}

fn phrase_stress_plan_resource_stats(
    resources: &[ResourceSpec],
    candidate_cache_dir: &Path,
    anchor_tokens: &HashSet<String>,
) -> Result<PhraseStressPlan> {
    let mut existing_resource_stats = Vec::new();
    let mut missing_anchor_row_partitions = 0usize;
    for resource in resources {
        match open_or_build_anchor_row_stream(resource, candidate_cache_dir, anchor_tokens, false)?
        {
            Some(stream) => existing_resource_stats.push(PhraseStressResourceStats {
                resource_id: resource.id.clone(),
                used_anchor_rows: true,
                source_candidates_seen: stream.source_candidates_seen(),
                candidates_seen: stream.anchor_rows(),
                empty_candidates: 0,
                duration_ms: 0,
                matches_by_pattern: Vec::new(),
                samples: Vec::new(),
            }),
            None => missing_anchor_row_partitions += 1,
        }
    }
    Ok(PhraseStressPlan {
        existing_resource_stats,
        missing_anchor_row_partitions,
    })
}

impl PhraseStressMatcher {
    fn new(pattern_rows: Vec<StressPattern>) -> Result<Self> {
        let mut by_pattern = BTreeMap::<String, Vec<usize>>::new();
        let mut anchor_tokens = HashSet::new();
        for (index, row) in pattern_rows.iter().enumerate() {
            by_pattern
                .entry(row.pattern.clone())
                .or_default()
                .push(index);
            anchor_tokens.insert(row.anchor.clone());
        }
        let mut patterns = Vec::with_capacity(by_pattern.len());
        let mut pattern_indexes_by_automaton = Vec::with_capacity(by_pattern.len());
        for (pattern, indexes) in by_pattern {
            patterns.push(pattern);
            pattern_indexes_by_automaton.push(indexes);
        }
        Ok(Self {
            automaton: AhoCorasick::new(&patterns)?,
            pattern_indexes_by_automaton,
            pattern_rows,
            anchor_tokens,
        })
    }

    fn matches_normalized(&self, normalized: &str) -> Vec<usize> {
        if !self.has_anchor_token(normalized) {
            return Vec::new();
        }
        let bytes = normalized.as_bytes();
        let mut matches = Vec::new();
        for matched in self.automaton.find_overlapping_iter(normalized) {
            if !is_space_boundary(bytes, matched.start())
                || !is_space_boundary(bytes, matched.end())
            {
                continue;
            }
            matches.extend(&self.pattern_indexes_by_automaton[matched.pattern().as_usize()]);
        }
        matches
    }

    fn has_anchor_token(&self, normalized: &str) -> bool {
        normalized
            .split_whitespace()
            .any(|token| self.anchor_tokens.contains(token))
    }
}

fn phrase_stress_resource(
    resource: ResourceSpec,
    matcher: Arc<PhraseStressMatcher>,
    candidate_cache_dir: PathBuf,
    sample_limit: usize,
    build_anchor_rows: bool,
    tx: mpsc::Sender<PhraseStressEvent>,
) {
    let resource_id = resource.id.clone();
    if let Err(err) = phrase_stress_resource_inner(
        resource,
        matcher,
        candidate_cache_dir,
        sample_limit,
        build_anchor_rows,
        &tx,
    ) {
        let _ = tx.send(PhraseStressEvent::Error(format!("{resource_id}: {err:#}")));
    }
}

fn phrase_stress_resource_inner(
    resource: ResourceSpec,
    matcher: Arc<PhraseStressMatcher>,
    candidate_cache_dir: PathBuf,
    sample_limit: usize,
    build_anchor_rows: bool,
    tx: &mpsc::Sender<PhraseStressEvent>,
) -> Result<()> {
    let started = Instant::now();
    let mut candidates_seen = 0usize;
    let mut empty_candidates = 0usize;
    let mut matches_by_pattern = vec![0usize; matcher.pattern_rows.len()];
    let mut sample_counts = vec![0usize; matcher.pattern_rows.len()];
    let mut samples = Vec::new();
    let Some(mut stream) = open_or_build_anchor_row_stream(
        &resource,
        &candidate_cache_dir,
        &matcher.anchor_tokens,
        build_anchor_rows,
    )?
    else {
        let mut stream = open_candidate_stream(&resource, Some(&candidate_cache_dir), true)
            .with_context(|| format!("open candidates for {}", resource.id))?;
        let mut source_candidates_seen = 0usize;
        while let Some(item) = stream.next_normalized() {
            let cached = item.with_context(|| format!("read source {}", resource.id))?;
            let normalized = cached.normalized;
            source_candidates_seen += 1;
            if normalized.is_empty() {
                empty_candidates += 1;
                continue;
            }
            if !matcher.has_anchor_token(&normalized) {
                continue;
            }
            candidates_seen += 1;
            let matched_patterns = matcher.matches_normalized(&normalized);
            if matched_patterns.is_empty() {
                continue;
            }
            let mut candidate = None;
            for pattern_index in matched_patterns {
                matches_by_pattern[pattern_index] += 1;
                if sample_counts[pattern_index] >= sample_limit {
                    continue;
                }
                if candidate.is_none() {
                    candidate = Some(stream.current_candidate()?);
                }
                let row = &matcher.pattern_rows[pattern_index];
                let found = candidate.as_ref().expect("candidate");
                samples.push(PhraseStressSample {
                    target_id: row.target_id.clone(),
                    kind: row.kind.clone(),
                    pattern: row.pattern.clone(),
                    resource_id: found.resource_id.clone(),
                    doc_id: found.doc_id.clone(),
                    title: found.title.clone(),
                    url: found.url.clone(),
                    sentence: found.sentence.clone(),
                });
                sample_counts[pattern_index] += 1;
            }
        }
        tx.send(PhraseStressEvent::Done(PhraseStressResourceStats {
            resource_id: resource.id,
            used_anchor_rows: false,
            source_candidates_seen,
            candidates_seen,
            empty_candidates,
            duration_ms: started.elapsed().as_millis(),
            matches_by_pattern,
            samples,
        }))
        .context("send fallback phrase stress resource stats")?;
        return Ok(());
    };
    let source_candidates_seen = stream.source_candidates_seen();

    for item in &mut stream {
        let anchor_row = item.with_context(|| format!("read anchor rows for {}", resource.id))?;
        let normalized = anchor_row.normalized;
        candidates_seen += 1;
        if normalized.is_empty() {
            empty_candidates += 1;
            continue;
        }
        let matched_patterns = matcher.matches_normalized(&normalized);
        if matched_patterns.is_empty() {
            continue;
        }
        for pattern_index in matched_patterns {
            matches_by_pattern[pattern_index] += 1;
            if sample_counts[pattern_index] >= sample_limit {
                continue;
            }
            let row = &matcher.pattern_rows[pattern_index];
            let found = &anchor_row.candidate;
            samples.push(PhraseStressSample {
                target_id: row.target_id.clone(),
                kind: row.kind.clone(),
                pattern: row.pattern.clone(),
                resource_id: found.resource_id.clone(),
                doc_id: found.doc_id.clone(),
                title: found.title.clone(),
                url: found.url.clone(),
                sentence: found.sentence.clone(),
            });
            sample_counts[pattern_index] += 1;
        }
    }

    tx.send(PhraseStressEvent::Done(PhraseStressResourceStats {
        resource_id: resource.id,
        used_anchor_rows: true,
        source_candidates_seen,
        candidates_seen,
        empty_candidates,
        duration_ms: started.elapsed().as_millis(),
        matches_by_pattern,
        samples,
    }))
    .context("send phrase stress resource stats")?;
    Ok(())
}

fn phrase_stress_candidates(
    misses: &[StressAuditMiss],
    args: &PhraseVariantStressArgs,
) -> Result<Vec<StressTarget>> {
    let requested_ids = split_csv(&args.target_ids)
        .into_iter()
        .collect::<HashSet<_>>();
    let requested_forms = split_csv(&args.forms)
        .into_iter()
        .map(|form| normalized_text(&form.replace('_', " ")))
        .collect::<HashSet<_>>();
    let explicit = !requested_ids.is_empty() || !requested_forms.is_empty();
    let selected = misses
        .iter()
        .filter(|miss| {
            let normalized_key = normalized_text(&miss.target_key.replace('_', " "));
            if explicit {
                requested_ids.contains(&miss.id) || requested_forms.contains(&normalized_key)
            } else {
                miss.trace_status.as_deref() == Some("raw_zero")
                    && miss.token_count > 1
                    && (miss.morphology_form.as_deref() == Some("analyzer_accepted")
                        || matches!(
                            miss.primary.as_str(),
                            "component_valid_phrase_absence"
                                | "scanner_variant_checked_but_absent"
                                | "needs_middle_passive_attestation"
                        ))
            }
        })
        .map(stress_target_from_miss)
        .filter(|target| target.tokens.len() > 1)
        .collect::<Vec<_>>();

    if explicit {
        let found_ids = selected
            .iter()
            .map(|target| target.id.clone())
            .collect::<HashSet<_>>();
        let missing_ids = requested_ids
            .into_iter()
            .filter(|id| !found_ids.contains(id))
            .collect::<Vec<_>>();
        if !missing_ids.is_empty() {
            bail!("unknown stress target id(s): {}", missing_ids.join(", "));
        }
        let found_forms = selected
            .iter()
            .map(|target| normalized_text(&target.target_key.replace('_', " ")))
            .collect::<HashSet<_>>();
        let missing_forms = requested_forms
            .into_iter()
            .filter(|form| !found_forms.contains(form))
            .collect::<Vec<_>>();
        if !missing_forms.is_empty() {
            bail!("unknown stress form(s): {}", missing_forms.join(", "));
        }
    }

    Ok(selected)
}

fn select_phrase_stress_targets(
    mut candidates: Vec<StressTarget>,
    args: &PhraseVariantStressArgs,
    anchor_counts: &HashMap<String, usize>,
) -> Vec<StressTarget> {
    for target in &mut candidates {
        target.anchor = stress_target_anchor(target).unwrap_or_default();
        target.anchor_partitions = anchor_counts
            .get(&target.anchor)
            .copied()
            .unwrap_or(usize::MAX);
    }
    candidates.sort_by(|a, b| {
        stress_priority(a)
            .cmp(&stress_priority(b))
            .then_with(|| a.target_key.cmp(&b.target_key))
            .then_with(|| a.id.cmp(&b.id))
    });
    let explicit = !split_csv(&args.target_ids).is_empty() || !split_csv(&args.forms).is_empty();
    if !args.all_targets {
        match args.limit_targets {
            Some(limit) => candidates.truncate(limit),
            None if !explicit => candidates.truncate(200),
            None => {}
        }
    }
    candidates
}

fn stress_target_from_miss(miss: &StressAuditMiss) -> StressTarget {
    let normalized_key = normalized_text(&miss.target_key.replace('_', " "));
    StressTarget {
        id: miss.id.clone(),
        target_key: miss.target_key.clone(),
        verb_id: miss.verb_id.clone(),
        lemma: miss.lemma.clone(),
        signature: miss.signature.clone(),
        primary: miss.primary.clone(),
        morphology_form: miss.morphology_form.clone(),
        morphology_scope: miss.morphology_scope.clone(),
        morphology_proof_level: miss.morphology_proof_level.clone(),
        tokens: normalized_key
            .split_whitespace()
            .map(ToOwned::to_owned)
            .collect(),
        anchor: String::new(),
        anchor_partitions: usize::MAX,
    }
}

fn anchor_partition_counts(
    resources: &[ResourceSpec],
    cache_dir: &Path,
    anchors: &HashSet<String>,
) -> Result<HashMap<String, usize>> {
    let mut counts = anchors
        .iter()
        .map(|anchor| (anchor.clone(), 0usize))
        .collect::<HashMap<_, _>>();
    if anchors.is_empty() {
        return Ok(counts);
    }
    for resource in resources {
        let Some(found) = cached_resource_token_hits(resource, cache_dir, anchors)? else {
            bail!(
                "missing or stale split cache/token inventory for {} in {}",
                resource.id,
                cache_dir.display()
            );
        };
        for token in found {
            if let Some(count) = counts.get_mut(&token) {
                *count += 1;
            }
        }
    }
    Ok(counts)
}

fn stress_target_anchor(target: &StressTarget) -> Option<String> {
    target.tokens.last().cloned()
}

fn stress_priority(target: &StressTarget) -> (usize, usize) {
    let shape = if target.tokens.first().map(String::as_str) == Some("nuk") {
        0
    } else if target.tokens.first().map(String::as_str) == Some("mos")
        && target.tokens.get(1).map(String::as_str) == Some("të")
    {
        1
    } else if target.tokens.iter().any(|token| token == "do")
        && target.tokens.iter().any(|token| token == "të")
    {
        2
    } else {
        3
    };
    let primary = match target.primary.as_str() {
        "component_valid_phrase_absence" => 0,
        "scanner_variant_checked_but_absent" => 1,
        "needs_middle_passive_attestation" => 2,
        "rare_or_analytic_cell" => 3,
        "near_empty_cell" => 4,
        _ => 5,
    };
    let morphology = if target.morphology_form.as_deref() == Some("analyzer_accepted") {
        0
    } else {
        1
    };
    (
        shape,
        target.anchor_partitions * 16 + primary * 2 + morphology,
    )
}

fn build_phrase_stress_patterns(targets: &[StressTarget]) -> Vec<StressPattern> {
    let mut rows = Vec::new();
    let mut seen = HashSet::new();
    for (target_index, target) in targets.iter().enumerate() {
        let mut target_rows = Vec::new();
        stress_patterns_for_target(target_index, target, &mut target_rows);
        let base_rows = target_rows.clone();
        for row in base_rows {
            if let Some(folded) = diacritic_fold_pattern(&row.pattern) {
                push_stress_pattern(
                    target_index,
                    target,
                    &format!("{}_diacritic_fold", row.kind),
                    split_pattern(&folded),
                    &mut target_rows,
                );
            }
        }
        for row in target_rows {
            if seen.insert((row.target_id.clone(), row.kind.clone(), row.pattern.clone())) {
                rows.push(row);
            }
        }
    }
    rows
}

fn stress_patterns_for_target(
    target_index: usize,
    target: &StressTarget,
    rows: &mut Vec<StressPattern>,
) {
    let tokens = &target.tokens;
    if tokens.len() < 2 {
        return;
    }
    let clitics = ["e", "i", "më", "me", "na", "ju", "u", "ia", "ua"];
    let head = tokens.last().expect("head");
    let prefix = &tokens[..tokens.len() - 1];

    for clitic in clitics {
        let mut pattern = prefix.to_vec();
        pattern.push(clitic.to_owned());
        pattern.push(head.clone());
        push_stress_pattern(target_index, target, "clitic_before_head", pattern, rows);
    }

    if tokens.first().map(String::as_str) == Some("nuk") {
        let tail = &tokens[1..];
        for clitic in clitics {
            let mut pattern = vec!["s".to_owned()];
            pattern.extend_from_slice(&tail[..tail.len() - 1]);
            pattern.push(clitic.to_owned());
            pattern.push(head.clone());
            push_stress_pattern(target_index, target, "s_clitic_before_head", pattern, rows);
        }
    }

    if tokens.first().map(String::as_str) == Some("mos")
        && tokens.get(1).map(String::as_str) == Some("të")
    {
        let tail = &tokens[2..];
        for clitic in clitics {
            let mut te_mos = vec!["të".to_owned(), "mos".to_owned()];
            te_mos.extend_from_slice(&tail[..tail.len() - 1]);
            te_mos.push(clitic.to_owned());
            te_mos.push(head.clone());
            push_stress_pattern(target_index, target, "te_mos_clitic", te_mos, rows);

            let mut mos = vec!["mos".to_owned()];
            mos.extend_from_slice(&tail[..tail.len() - 1]);
            mos.push(clitic.to_owned());
            mos.push(head.clone());
            push_stress_pattern(target_index, target, "mos_clitic_no_te", mos, rows);
        }
    }

    if prefix.iter().any(|token| token == "të") {
        let shortened = tokens
            .iter()
            .map(|token| if token == "të" { "t" } else { token })
            .map(ToOwned::to_owned)
            .collect::<Vec<_>>();
        push_stress_pattern(target_index, target, "short_t_particle", shortened, rows);
    }

    if prefix.last().map(String::as_str) == Some("të") {
        let before_te = &prefix[..prefix.len() - 1];
        for clitic_pattern in [
            vec!["ta"],
            vec!["t", "i"],
            vec!["t", "ia"],
            vec!["t", "ua"],
            vec!["t", "u"],
        ] {
            let mut pattern = before_te.to_vec();
            pattern.extend(clitic_pattern.into_iter().map(ToOwned::to_owned));
            pattern.push(head.clone());
            push_stress_pattern(target_index, target, "t_contracted_clitic", pattern, rows);
        }
    }
}

fn push_stress_pattern(
    target_index: usize,
    target: &StressTarget,
    kind: &str,
    tokens: Vec<String>,
    rows: &mut Vec<StressPattern>,
) {
    if tokens.len() < 2 || tokens == target.tokens {
        return;
    }
    let pattern = tokens.join(" ");
    if pattern.is_empty() || rows.iter().any(|row| row.pattern == pattern) {
        return;
    }
    let anchor = anchor_for_stress_pattern(&tokens);
    rows.push(StressPattern {
        target_index,
        target_id: target.id.clone(),
        kind: kind.to_owned(),
        pattern,
        anchor,
    });
}

fn anchor_for_stress_pattern(tokens: &[String]) -> String {
    tokens
        .iter()
        .filter(|token| !matches!((*token).as_str(), "nuk" | "mos" | "të" | "te" | "do" | "s"))
        .max_by_key(|token| token.chars().count())
        .cloned()
        .or_else(|| {
            tokens
                .iter()
                .max_by_key(|token| token.chars().count())
                .cloned()
        })
        .unwrap_or_default()
}

fn split_pattern(pattern: &str) -> Vec<String> {
    pattern.split_whitespace().map(ToOwned::to_owned).collect()
}

fn diacritic_fold_pattern(pattern: &str) -> Option<String> {
    let mut folded = String::with_capacity(pattern.len());
    let mut changed = false;
    for ch in pattern.chars() {
        match ch {
            'ë' => {
                folded.push('e');
                changed = true;
            }
            'ç' => {
                folded.push('c');
                changed = true;
            }
            _ => folded.push(ch),
        }
    }
    changed.then_some(folded)
}

fn build_phrase_variant_stress_report(
    args: &PhraseVariantStressArgs,
    audit: &MissingAuditFile,
    targets: &[StressTarget],
    patterns: &[StressPattern],
    matches_by_pattern: &[usize],
    resource_stats: Vec<PhraseStressResourceStats>,
    samples: Vec<PhraseStressSample>,
    source_partitions: usize,
    skipped_partitions: usize,
    missing_anchor_row_partitions: usize,
    duration_ms: u128,
) -> Result<PhraseVariantStressReport> {
    let mut target_patterns = vec![Vec::<PhraseVariantStressPattern>::new(); targets.len()];
    let mut target_matches = vec![0usize; targets.len()];
    let mut by_kind = HashMap::<String, (usize, usize)>::new();
    for (index, row) in patterns.iter().enumerate() {
        let raw_matches = matches_by_pattern.get(index).copied().unwrap_or(0);
        target_matches[row.target_index] += raw_matches;
        if !args.plan_only {
            target_patterns[row.target_index].push(PhraseVariantStressPattern {
                kind: row.kind.clone(),
                pattern: row.pattern.clone(),
                raw_matches,
            });
        }
        let entry = by_kind.entry(row.kind.clone()).or_insert((0, 0));
        entry.0 += 1;
        entry.1 += raw_matches;
    }
    let mut pattern_kind_counts = by_kind
        .into_iter()
        .map(|(key, (patterns, raw_matches))| PhraseVariantStressKind {
            key,
            patterns,
            raw_matches,
        })
        .collect::<Vec<_>>();
    pattern_kind_counts.sort_by(|a, b| {
        b.raw_matches
            .cmp(&a.raw_matches)
            .then_with(|| b.patterns.cmp(&a.patterns))
            .then_with(|| a.key.cmp(&b.key))
    });

    let report_targets = targets
        .iter()
        .enumerate()
        .take(if args.plan_only { 50 } else { targets.len() })
        .map(|(index, target)| PhraseVariantStressTarget {
            id: target.id.clone(),
            target_key: target.target_key.clone(),
            lemma: target.lemma.clone(),
            signature: target.signature.clone(),
            primary: target.primary.clone(),
            morphology_form: target.morphology_form.clone(),
            morphology_scope: target.morphology_scope.clone(),
            anchor: target.anchor.clone(),
            anchor_partitions: target.anchor_partitions,
            matched: target_matches[index] > 0,
            raw_matches: target_matches[index],
            patterns: std::mem::take(&mut target_patterns[index]),
        })
        .collect::<Vec<_>>();
    let reported_target_patterns = report_targets
        .iter()
        .map(|target| target.patterns.len())
        .sum::<usize>();
    let scanned_partitions = if args.plan_only {
        0
    } else {
        resource_stats.len()
    };
    let existing_anchor_row_partitions = resource_stats
        .iter()
        .filter(|stats| stats.used_anchor_rows)
        .count();
    let candidates_seen = resource_stats
        .iter()
        .map(|stats| stats.source_candidates_seen)
        .sum::<usize>();
    let anchor_candidates_seen = resource_stats
        .iter()
        .map(|stats| stats.candidates_seen)
        .sum::<usize>();
    let empty_candidates = resource_stats
        .iter()
        .map(|stats| stats.empty_candidates)
        .sum::<usize>();
    let raw_matches = matches_by_pattern.iter().sum::<usize>();
    let matched_patterns = matches_by_pattern
        .iter()
        .filter(|count| **count > 0)
        .count();
    let matched_targets = target_matches.iter().filter(|count| **count > 0).count();
    let resources = resource_stats
        .into_iter()
        .map(|stats| PhraseVariantStressResource {
            resource_id: stats.resource_id,
            used_anchor_rows: stats.used_anchor_rows,
            source_candidates_seen: stats.source_candidates_seen,
            candidates_seen: stats.candidates_seen,
            empty_candidates: stats.empty_candidates,
            duration_ms: stats.duration_ms,
        })
        .collect();

    Ok(PhraseVariantStressReport {
        generated_at: current_timestamp()?,
        audit_path: args.audit.display().to_string(),
        audit_generated_at: audit.generated_at.clone(),
        candidate_cache_dir: args.candidate_cache_dir.display().to_string(),
        summary: PhraseVariantStressSummary {
            plan_only: args.plan_only,
            audit_total_targets: audit
                .summary
                .get("totalTargets")
                .and_then(serde_json::Value::as_u64)
                .map(|value| value as usize),
            selected_targets: targets.len(),
            reported_targets: report_targets.len(),
            stress_patterns: patterns.len(),
            reported_target_patterns,
            anchor_tokens: patterns
                .iter()
                .map(|pattern| pattern.anchor.as_str())
                .collect::<HashSet<_>>()
                .len(),
            matched_targets,
            matched_patterns,
            raw_matches,
            source_partitions,
            skipped_partitions,
            scanned_partitions,
            existing_anchor_row_partitions,
            missing_anchor_row_partitions,
            candidates_seen,
            anchor_candidates_seen,
            empty_candidates,
            duration_ms,
        },
        pattern_kind_counts,
        targets: report_targets,
        resource_stats: resources,
        samples,
    })
}

fn write_phrase_variant_stress_report(
    report: &PhraseVariantStressReport,
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
    fs::write(out_md, phrase_variant_stress_markdown(report))?;
    Ok(())
}

fn phrase_variant_stress_markdown(report: &PhraseVariantStressReport) -> String {
    let mut lines = vec![
        "# Corpus Phrase-Variant Stress".to_owned(),
        String::new(),
        format!("Generated: {}", report.generated_at),
        format!("Audit: {}", report.audit_path),
        format!("Candidate cache: {}", report.candidate_cache_dir),
        String::new(),
        "## Summary".to_owned(),
        String::new(),
        format!("- Plan only: {}", report.summary.plan_only),
        format!("- Selected targets: {}", report.summary.selected_targets),
        format!(
            "- Target rows in report: {}",
            report.summary.reported_targets
        ),
        format!("- Stress patterns: {}", report.summary.stress_patterns),
        format!(
            "- Target patterns in report: {}",
            report.summary.reported_target_patterns
        ),
        format!("- Unique pattern anchors: {}", report.summary.anchor_tokens),
        format!("- Matched targets: {}", report.summary.matched_targets),
        format!("- Matched patterns: {}", report.summary.matched_patterns),
        format!("- Raw matches: {}", report.summary.raw_matches),
        format!("- Source partitions: {}", report.summary.source_partitions),
        format!(
            "- Skipped partitions by token inventory: {}",
            report.summary.skipped_partitions
        ),
        format!(
            "- Scanned partitions: {}",
            report.summary.scanned_partitions
        ),
        format!(
            "- Existing anchor-row partitions: {}",
            report.summary.existing_anchor_row_partitions
        ),
        format!(
            "- Missing anchor-row partitions: {}",
            report.summary.missing_anchor_row_partitions
        ),
        format!(
            "- Source candidates covered: {}",
            report.summary.candidates_seen
        ),
        format!(
            "- Anchor candidates checked: {}",
            report.summary.anchor_candidates_seen
        ),
        format!(
            "- Duration: {:.1}s",
            report.summary.duration_ms as f64 / 1000.0
        ),
        "Raw matches are stress-pattern hits; one sentence can match more than one pattern."
            .to_owned(),
        "Plan-only reports do not evaluate matches; zero match counts mean not scanned.".to_owned(),
        String::new(),
        "## Variant Kinds".to_owned(),
        String::new(),
        "| Kind | Patterns | Raw Matches |".to_owned(),
        "| --- | ---: | ---: |".to_owned(),
    ];
    for row in &report.pattern_kind_counts {
        lines.push(format!(
            "| {} | {} | {} |",
            md_escape(&row.key),
            row.patterns,
            row.raw_matches
        ));
    }
    lines.extend([
        String::new(),
        "## Matched Targets".to_owned(),
        String::new(),
        "| Target | Lemma | Signature | Primary | Anchor | Anchor Partitions | Raw Matches | Matched Patterns |".to_owned(),
        "| --- | --- | --- | --- | --- | ---: | ---: | --- |".to_owned(),
    ]);
    for target in report
        .targets
        .iter()
        .filter(|target| target.matched)
        .take(50)
    {
        let matched_patterns = target
            .patterns
            .iter()
            .filter(|pattern| pattern.raw_matches > 0)
            .map(|pattern| format!("{}: {}", pattern.kind, pattern.pattern))
            .collect::<Vec<_>>()
            .join("; ");
        lines.push(format!(
            "| {} | {} | {} | {} | {} | {} | {} | {} |",
            md_escape(&target.target_key),
            md_escape(&target.lemma),
            md_escape(&target.signature),
            md_escape(&target.primary),
            md_escape(&target.anchor),
            target.anchor_partitions,
            target.raw_matches,
            md_escape(&matched_patterns)
        ));
    }
    lines.extend([
        String::new(),
        "## Selected Targets".to_owned(),
        String::new(),
        "| Target | Lemma | Primary | Anchor | Anchor Partitions |".to_owned(),
        "| --- | --- | --- | --- | ---: |".to_owned(),
    ]);
    for target in report.targets.iter().take(50) {
        lines.push(format!(
            "| {} | {} | {} | {} | {} |",
            md_escape(&target.target_key),
            md_escape(&target.lemma),
            md_escape(&target.primary),
            md_escape(&target.anchor),
            target.anchor_partitions
        ));
    }
    lines.extend([
        String::new(),
        "## Samples".to_owned(),
        String::new(),
        "| Target ID | Kind | Pattern | Resource | Sentence |".to_owned(),
        "| --- | --- | --- | --- | --- |".to_owned(),
    ]);
    for sample in report.samples.iter().take(80) {
        lines.push(format!(
            "| {} | {} | {} | {} | {} |",
            md_escape(&sample.target_id),
            md_escape(&sample.kind),
            md_escape(&sample.pattern),
            md_escape(&sample.resource_id),
            md_escape(&sample.sentence)
        ));
    }
    lines.push(String::new());
    lines.join("\n")
}
