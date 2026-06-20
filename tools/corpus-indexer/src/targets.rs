use crate::text::normalize_token;
use aho_corasick::AhoCorasick;
use anyhow::Result;
use serde::Deserialize;
use serde_json::Value;
use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Target {
    pub id: String,
    pub target_key: String,
    pub display_form: String,
    pub tokens: Vec<String>,
    pub signature: String,
    pub anc_tags: Vec<String>,
    pub anc_query: String,
    pub cell_label: String,
    pub verb_id: String,
    pub lemma: String,
    pub translation_en: String,
    pub options_json: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MatchKind {
    ExactToken,
    ExactPhrase,
}

impl MatchKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::ExactToken => "exact_token",
            Self::ExactPhrase => "exact_phrase",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VariantKind {
    Canonical,
    TeMosOrder,
    SNegative,
    DiacriticFold,
}

impl VariantKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Canonical => "canonical",
            Self::TeMosOrder => "te_mos_order",
            Self::SNegative => "s_negative",
            Self::DiacriticFold => "diacritic_fold",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TargetMatch<'a> {
    pub id: &'a str,
    pub target_key: &'a str,
    pub signature: &'a str,
    pub kind: MatchKind,
    pub variant_kind: VariantKind,
    pub matched_pattern: &'a str,
}

#[derive(Debug, Clone)]
struct PatternTarget {
    target: Target,
    variant_kind: VariantKind,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct TargetPattern {
    pattern: String,
    variant_kind: VariantKind,
}

pub fn load_targets(path: impl AsRef<Path>) -> Result<Vec<Target>> {
    targets_from_json(&fs::read_to_string(path)?)
}

fn targets_from_json(raw: &str) -> Result<Vec<Target>> {
    let file: TargetFile = serde_json::from_str(raw)?;
    Ok(file.targets.into_iter().map(Target::from).collect())
}

pub struct TargetMatcher {
    automaton: AhoCorasick,
    anchor_tokens: Option<HashSet<String>>,
    patterns: Vec<String>,
    targets_by_pattern: Vec<Vec<PatternTarget>>,
}

impl TargetMatcher {
    pub fn new(targets: Vec<Target>) -> Result<Self> {
        Self::from_targets(targets, false)
    }

    pub fn new_with_anchor_prefilter(targets: Vec<Target>) -> Result<Self> {
        Self::from_targets(targets, true)
    }

    fn from_targets(targets: Vec<Target>, use_anchor_prefilter: bool) -> Result<Self> {
        let mut by_pattern = BTreeMap::<String, Vec<PatternTarget>>::new();
        for target in targets {
            if target.tokens.is_empty() {
                continue;
            }
            for pattern in patterns_for_target(&target) {
                by_pattern
                    .entry(pattern.pattern)
                    .or_default()
                    .push(PatternTarget {
                        target: target.clone(),
                        variant_kind: pattern.variant_kind,
                    });
            }
        }

        let mut patterns = Vec::with_capacity(by_pattern.len());
        let mut targets_by_pattern = Vec::with_capacity(by_pattern.len());
        for (pattern, targets) in by_pattern {
            patterns.push(pattern);
            targets_by_pattern.push(targets);
        }

        let anchor_tokens = use_anchor_prefilter.then(|| {
            patterns
                .iter()
                .filter_map(|pattern| anchor_for_pattern(pattern))
                .collect()
        });

        Ok(Self {
            automaton: AhoCorasick::new(&patterns)?,
            anchor_tokens,
            patterns,
            targets_by_pattern,
        })
    }

    pub fn matches_normalized(&self, normalized: &str) -> Vec<TargetMatch<'_>> {
        let mut matches = Vec::new();
        if !self.has_anchor_token(normalized) {
            return matches;
        }
        let bytes = normalized.as_bytes();

        for matched in self.automaton.find_overlapping_iter(normalized) {
            if !is_token_boundary(bytes, matched.start())
                || !is_token_boundary(bytes, matched.end())
            {
                continue;
            }

            let pattern_index = matched.pattern().as_usize();
            let matched_pattern = self.patterns[pattern_index].as_str();
            for entry in &self.targets_by_pattern[pattern_index] {
                let target = &entry.target;
                matches.push(TargetMatch {
                    id: &target.id,
                    target_key: &target.target_key,
                    signature: &target.signature,
                    kind: if target.tokens.len() == 1 {
                        MatchKind::ExactToken
                    } else {
                        MatchKind::ExactPhrase
                    },
                    variant_kind: entry.variant_kind,
                    matched_pattern,
                });
            }
        }

        matches
    }

    fn has_anchor_token(&self, normalized: &str) -> bool {
        let Some(anchor_tokens) = &self.anchor_tokens else {
            return true;
        };
        normalized
            .split_whitespace()
            .any(|token| anchor_tokens.contains(token))
    }
}

fn anchor_for_pattern(pattern: &str) -> Option<String> {
    pattern
        .split_whitespace()
        .max_by_key(|token| token.chars().count())
        .map(ToOwned::to_owned)
}

fn patterns_for_target(target: &Target) -> Vec<TargetPattern> {
    let mut patterns = Vec::new();
    push_pattern(
        &mut patterns,
        target.tokens.join(" "),
        VariantKind::Canonical,
    );
    if target.tokens.first().map(String::as_str) == Some("mos")
        && target.tokens.get(1).map(String::as_str) == Some("të")
    {
        push_pattern(
            &mut patterns,
            std::iter::once("të")
                .chain(std::iter::once("mos"))
                .chain(target.tokens.iter().skip(2).map(String::as_str))
                .collect::<Vec<_>>()
                .join(" "),
            VariantKind::TeMosOrder,
        );
    }
    if target.tokens.first().map(String::as_str) == Some("nuk") && target.tokens.len() > 1 {
        push_pattern(
            &mut patterns,
            std::iter::once("s")
                .chain(target.tokens.iter().skip(1).map(String::as_str))
                .collect::<Vec<_>>()
                .join(" "),
            VariantKind::SNegative,
        );
    }

    let base_patterns = patterns.clone();
    for pattern in base_patterns {
        if let Some(folded) = diacritic_fold(&pattern.pattern) {
            push_pattern(&mut patterns, folded, VariantKind::DiacriticFold);
        }
    }

    patterns
}

fn push_pattern(patterns: &mut Vec<TargetPattern>, pattern: String, variant_kind: VariantKind) {
    if pattern.is_empty() || patterns.iter().any(|entry| entry.pattern == pattern) {
        return;
    }
    patterns.push(TargetPattern {
        pattern,
        variant_kind,
    });
}

fn diacritic_fold(pattern: &str) -> Option<String> {
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

fn is_token_boundary(bytes: &[u8], index: usize) -> bool {
    index == 0 || index == bytes.len() || bytes[index - 1] == b' ' || bytes[index] == b' '
}

#[derive(Debug, Deserialize)]
struct TargetFile {
    targets: Vec<TargetRow>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TargetRow {
    id: String,
    target_key: String,
    display_form: String,
    tokens: Vec<String>,
    signature: String,
    anc_tags: Vec<String>,
    anc_query: String,
    cell_label: String,
    verb_id: String,
    lemma: String,
    translation_en: String,
    options: Value,
}

impl From<TargetRow> for Target {
    fn from(row: TargetRow) -> Self {
        Self {
            id: row.id,
            target_key: row.target_key,
            display_form: row.display_form,
            tokens: row
                .tokens
                .into_iter()
                .map(|token| normalize_token(&token))
                .filter(|token| !token.is_empty())
                .collect(),
            signature: row.signature,
            anc_tags: row.anc_tags,
            anc_query: row.anc_query,
            cell_label: row.cell_label,
            verb_id: row.verb_id,
            lemma: row.lemma,
            translation_en: row.translation_en,
            options_json: row.options.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::text::tokens_for;

    use super::{targets_from_json, MatchKind, TargetMatcher, VariantKind};

    const TARGETS_JSON: &str = r#"
{
  "generatedAt": "2026-06-17T00:00:00.000Z",
  "engine": "foljapp",
  "corpusVersion": "0.1.5",
  "formFilter": null,
  "targets": [
    {
      "id": "punoj:indicative.present.1sg.active.affirmative.declarative:punoj",
      "targetKey": "punoj",
      "displayForm": "PUNOJ",
      "tokens": ["PUNOJ"],
      "signature": "indicative.present.1sg.active.affirmative.declarative",
      "ancTags": ["V", "ind"],
      "ancQuery": "V ind",
      "cellLabel": "indicative present 1sg active",
      "verbId": "punoj",
      "lemma": "punoj",
      "translationEn": "to work",
      "options": {"mood": "indicative"}
    },
    {
      "id": "punoj:subjunctive.present.1sg.active.affirmative.declarative:t_punoj",
      "targetKey": "t\u00eb punoj",
      "displayForm": "t\u00eb punoj",
      "tokens": ["t\u00eb", "punoj"],
      "signature": "subjunctive.present.1sg.active.affirmative.declarative",
      "ancTags": ["V", "sbjv"],
      "ancQuery": "V sbjv",
      "cellLabel": "subjunctive present 1sg active",
      "verbId": "punoj",
      "lemma": "punoj",
      "translationEn": "to work",
      "options": {"mood": "subjunctive"}
    }
  ]
}
"#;

    #[test]
    fn loads_target_rows_needed_by_scanner() {
        let targets = targets_from_json(TARGETS_JSON).expect("targets parse");

        assert_eq!(targets.len(), 2);
        assert_eq!(targets[0].tokens, vec!["punoj"]);
        assert_eq!(targets[0].options_json, r#"{"mood":"indicative"}"#);
        assert_eq!(targets[1].target_key, "t\u{00eb} punoj");
        assert_eq!(targets[1].anc_tags, vec!["V", "sbjv"]);
    }

    #[test]
    fn matches_many_targets_in_one_normalized_pass() {
        let targets = targets_from_json(TARGETS_JSON).expect("targets parse");
        let matcher = TargetMatcher::new(targets).expect("matcher builds");
        let normalized = tokens_for("Ai T\u{00cb} punoj, pastaj punoj.").join(" ");
        let matches = matcher.matches_normalized(&normalized);

        assert_eq!(matches.len(), 3);
        assert_eq!(matches[0].target_key, "t\u{00eb} punoj");
        assert_eq!(matches[0].kind, MatchKind::ExactPhrase);
        assert_eq!(matches[0].variant_kind, VariantKind::Canonical);
        assert_eq!(matches[0].matched_pattern, "t\u{00eb} punoj");
        assert_eq!(matches[1].target_key, "punoj");
        assert_eq!(matches[1].kind, MatchKind::ExactToken);
        assert_eq!(matches[1].variant_kind, VariantKind::Canonical);
        assert_eq!(matches[1].matched_pattern, "punoj");
        assert_eq!(matches[2].target_key, "punoj");
    }

    #[test]
    fn matches_te_mos_order_for_mos_te_targets() {
        let targets = targets_from_json(
            r#"
{
  "targets": [
    {
      "id": "punoj:subjunctive.present.1sg.active.negative.declarative:mos_t_punoj",
      "targetKey": "mos t\u00eb punoj",
      "displayForm": "mos t\u00eb punoj",
      "tokens": ["mos", "t\u00eb", "punoj"],
      "signature": "subjunctive.present.1sg.active.negative.declarative",
      "ancTags": ["V", "sbjv"],
      "ancQuery": "V sbjv",
      "cellLabel": "subjunctive present 1sg active",
      "verbId": "punoj",
      "lemma": "punoj",
      "translationEn": "to work",
      "options": {"mood": "subjunctive"}
    }
  ]
}
"#,
        )
        .expect("targets parse");
        let matcher = TargetMatcher::new(targets).expect("matcher builds");
        let normalized = tokens_for("Vendosa të mos punoj sot.").join(" ");
        let matches = matcher.matches_normalized(&normalized);

        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].target_key, "mos t\u{00eb} punoj");
        assert_eq!(matches[0].kind, MatchKind::ExactPhrase);
        assert_eq!(matches[0].variant_kind, VariantKind::TeMosOrder);
        assert_eq!(matches[0].matched_pattern, "t\u{00eb} mos punoj");
    }

    #[test]
    fn matches_s_negative_for_nuk_targets() {
        let targets = targets_from_json(
            r#"
{
  "targets": [
    {
      "id": "punoj:indicative.present.1sg.active.negative.declarative:nuk_punoj",
      "targetKey": "nuk punoj",
      "displayForm": "nuk punoj",
      "tokens": ["nuk", "punoj"],
      "signature": "indicative.present.1sg.active.negative.declarative",
      "ancTags": ["V", "ind"],
      "ancQuery": "V ind",
      "cellLabel": "indicative present 1sg active",
      "verbId": "punoj",
      "lemma": "punoj",
      "translationEn": "to work",
      "options": {"mood": "indicative"}
    }
  ]
}
"#,
        )
        .expect("targets parse");
        let matcher = TargetMatcher::new(targets).expect("matcher builds");
        let normalized = tokens_for("Un\u{00eb} s'punoj sot.").join(" ");
        let matches = matcher.matches_normalized(&normalized);

        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].target_key, "nuk punoj");
        assert_eq!(matches[0].kind, MatchKind::ExactPhrase);
        assert_eq!(matches[0].variant_kind, VariantKind::SNegative);
        assert_eq!(matches[0].matched_pattern, "s punoj");
    }

    #[test]
    fn matches_diacritic_fold_variants() {
        let targets = targets_from_json(
            r#"
{
  "targets": [
    {
      "id": "coj:subjunctive.present.1sg.active.affirmative.declarative:t_coj",
      "targetKey": "t\u00eb \u00e7oj",
      "displayForm": "t\u00eb \u00e7oj",
      "tokens": ["t\u00eb", "\u00e7oj"],
      "signature": "subjunctive.present.1sg.active.affirmative.declarative",
      "ancTags": ["V", "sbjv"],
      "ancQuery": "V sbjv",
      "cellLabel": "subjunctive present 1sg active",
      "verbId": "coj",
      "lemma": "\u00e7oj",
      "translationEn": "to send",
      "options": {"mood": "subjunctive"}
    }
  ]
}
"#,
        )
        .expect("targets parse");
        let matcher = TargetMatcher::new(targets).expect("matcher builds");
        let normalized = tokens_for("Dua te coj letren.").join(" ");
        let matches = matcher.matches_normalized(&normalized);

        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].target_key, "t\u{00eb} \u{00e7}oj");
        assert_eq!(matches[0].kind, MatchKind::ExactPhrase);
        assert_eq!(matches[0].variant_kind, VariantKind::DiacriticFold);
        assert_eq!(matches[0].matched_pattern, "te coj");
    }
}
