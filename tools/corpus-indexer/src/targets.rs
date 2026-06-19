use crate::text::normalize_token;
use aho_corasick::AhoCorasick;
use anyhow::Result;
use serde::Deserialize;
use serde_json::Value;
use std::collections::BTreeMap;
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
pub struct TargetMatch<'a> {
    pub id: &'a str,
    pub target_key: &'a str,
    pub signature: &'a str,
    pub kind: MatchKind,
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
    targets_by_pattern: Vec<Vec<Target>>,
}

impl TargetMatcher {
    pub fn new(targets: Vec<Target>) -> Result<Self> {
        let mut by_pattern = BTreeMap::<String, Vec<Target>>::new();
        for target in targets {
            if target.tokens.is_empty() {
                continue;
            }
            for pattern in patterns_for_target(&target) {
                by_pattern.entry(pattern).or_default().push(target.clone());
            }
        }

        let mut patterns = Vec::with_capacity(by_pattern.len());
        let mut targets_by_pattern = Vec::with_capacity(by_pattern.len());
        for (pattern, targets) in by_pattern {
            patterns.push(pattern);
            targets_by_pattern.push(targets);
        }

        Ok(Self {
            automaton: AhoCorasick::new(patterns)?,
            targets_by_pattern,
        })
    }

    pub fn matches_normalized(&self, normalized: &str) -> Vec<TargetMatch<'_>> {
        let mut matches = Vec::new();
        let bytes = normalized.as_bytes();

        for matched in self.automaton.find_overlapping_iter(normalized) {
            if !is_token_boundary(bytes, matched.start())
                || !is_token_boundary(bytes, matched.end())
            {
                continue;
            }

            for target in &self.targets_by_pattern[matched.pattern().as_usize()] {
                matches.push(TargetMatch {
                    id: &target.id,
                    target_key: &target.target_key,
                    signature: &target.signature,
                    kind: if target.tokens.len() == 1 {
                        MatchKind::ExactToken
                    } else {
                        MatchKind::ExactPhrase
                    },
                });
            }
        }

        matches
    }
}

fn patterns_for_target(target: &Target) -> Vec<String> {
    let mut patterns = vec![target.tokens.join(" ")];
    if target.tokens.first().map(String::as_str) == Some("mos")
        && target.tokens.get(1).map(String::as_str) == Some("të")
    {
        patterns.push(
            std::iter::once("të")
                .chain(std::iter::once("mos"))
                .chain(target.tokens.iter().skip(2).map(String::as_str))
                .collect::<Vec<_>>()
                .join(" "),
        );
    }
    patterns.sort();
    patterns.dedup();
    patterns
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

    use super::{targets_from_json, MatchKind, TargetMatcher};

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
        assert_eq!(matches[1].target_key, "punoj");
        assert_eq!(matches[1].kind, MatchKind::ExactToken);
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
    }
}
