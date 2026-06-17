use crate::text::normalize_token;
use anyhow::Result;
use serde::Deserialize;
use serde_json::Value;
use std::collections::{BTreeMap, HashMap};
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

type TargetsByToken = HashMap<Vec<String>, Vec<Target>>;
type TargetsByWidth = BTreeMap<usize, TargetsByToken>;

pub struct TargetIndex {
    by_first: HashMap<String, TargetsByWidth>,
}

impl TargetIndex {
    pub fn new(targets: Vec<Target>) -> Self {
        let mut by_first: HashMap<String, TargetsByWidth> = HashMap::new();

        for target in targets {
            if target.tokens.is_empty() {
                continue;
            }

            let first = target.tokens[0].clone();
            let width = target.tokens.len();
            let key = target.tokens.clone();

            by_first
                .entry(first)
                .or_default()
                .entry(width)
                .or_default()
                .entry(key)
                .or_default()
                .push(target);
        }

        Self { by_first }
    }

    pub fn matches_tokens(&self, tokens: &[String]) -> Vec<TargetMatch<'_>> {
        let mut matches = Vec::new();

        for (index, token) in tokens.iter().enumerate() {
            let Some(by_len) = self.by_first.get(token) else {
                continue;
            };

            for (width, by_tokens) in by_len {
                let end = index + width;
                if end > tokens.len() {
                    continue;
                }

                let Some(targets) = by_tokens.get(&tokens[index..end]) else {
                    continue;
                };

                let kind = if *width == 1 {
                    MatchKind::ExactToken
                } else {
                    MatchKind::ExactPhrase
                };

                for target in targets {
                    matches.push(TargetMatch {
                        id: &target.id,
                        target_key: &target.target_key,
                        signature: &target.signature,
                        kind,
                    });
                }
            }
        }

        matches
    }
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

    use super::{targets_from_json, MatchKind, TargetIndex};

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
    fn matches_tokens_and_phrases_by_tuple_lookup() {
        let targets = targets_from_json(TARGETS_JSON).expect("targets parse");
        let index = TargetIndex::new(targets);
        let tokens = tokens_for("Ai T\u{00cb} punoj, pastaj punoj.");
        let matches = index.matches_tokens(&tokens);

        assert_eq!(matches.len(), 3);
        assert_eq!(matches[0].target_key, "t\u{00eb} punoj");
        assert_eq!(matches[0].kind, MatchKind::ExactPhrase);
        assert_eq!(matches[0].kind.as_str(), "exact_phrase");
        assert_eq!(matches[1].target_key, "punoj");
        assert_eq!(matches[1].kind, MatchKind::ExactToken);
        assert_eq!(matches[2].target_key, "punoj");
        assert_eq!(matches[2].kind, MatchKind::ExactToken);
    }
}
