use crate::sources::{Candidate, ResourceSpec};
use crate::targets::Target;
use anyhow::Result;
use rusqlite::{params, Connection, OptionalExtension};
use std::fs;
use std::path::{Path, PathBuf};

pub struct ExampleDb {
    con: Connection,
}

impl ExampleDb {
    pub fn open(path: &Path, append: bool) -> Result<Self> {
        if path.exists() && !append {
            fs::remove_file(path)?;
            remove_sidecar(path, "wal")?;
            remove_sidecar(path, "shm")?;
        }
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let con = Connection::open(path)?;
        con.pragma_update(None, "journal_mode", "WAL")?;
        con.pragma_update(None, "synchronous", "NORMAL")?;
        con.pragma_update(None, "temp_store", "MEMORY")?;
        con.execute_batch(SCHEMA)?;
        con.execute(
            "INSERT OR REPLACE INTO metadata(key, value) VALUES ('schema_version', '1')",
            [],
        )?;
        Ok(Self { con })
    }

    pub fn insert_resources(&self, resources: &[ResourceSpec]) -> Result<()> {
        let mut stmt = self.con.prepare(
            r#"
            INSERT OR IGNORE INTO resources(id, title, kind, source_url, local_path, license)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )?;
        for resource in resources {
            stmt.execute(params![
                &resource.id,
                &resource.title,
                &resource.resource_kind,
                resource.source_url.as_deref(),
                &resource.local_path_text,
                resource.license.as_deref()
            ])?;
        }
        Ok(())
    }

    pub fn insert_targets(&self, targets: &[Target]) -> Result<()> {
        let mut stmt = self.con.prepare(
            r#"
            INSERT OR IGNORE INTO targets(
              id, target_key, display_form, signature, anc_query, anc_tags_json,
              cell_label, verb_id, lemma, translation_en, options_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )?;
        for target in targets {
            stmt.execute(params![
                &target.id,
                &target.target_key,
                &target.display_form,
                &target.signature,
                &target.anc_query,
                serde_json::to_string(&target.anc_tags)?,
                &target.cell_label,
                &target.verb_id,
                &target.lemma,
                &target.translation_en,
                &target.options_json
            ])?;
        }
        Ok(())
    }

    pub fn begin(&self) -> Result<()> {
        self.con.execute_batch("BEGIN")?;
        Ok(())
    }

    pub fn commit(&self) -> Result<()> {
        self.con.execute_batch("COMMIT")?;
        Ok(())
    }

    pub fn insert_sentence(
        &self,
        candidate: &Candidate,
        normalized: &str,
        flags_json: &str,
    ) -> Result<Option<i64>> {
        let inserted = self.con.execute(
            r#"
            INSERT OR IGNORE INTO sentences(
              resource_id, doc_id, title, url, domain, genre, quality,
              sentence, normalized, flags_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            params![
                &candidate.resource_id,
                Some(candidate.doc_id.as_str()),
                candidate.title.as_deref(),
                candidate.url.as_deref(),
                candidate.domain.as_deref(),
                candidate.genre.as_deref(),
                candidate.quality.as_deref(),
                &candidate.sentence,
                normalized,
                flags_json
            ],
        )?;
        if inserted == 1 {
            let id = self.con.last_insert_rowid();
            self.con.execute(
                "INSERT INTO sentence_fts(rowid, sentence, normalized) VALUES (?, ?, ?)",
                params![id, candidate.sentence, normalized],
            )?;
            return Ok(Some(id));
        }

        let existing = self
            .con
            .query_row(
                "SELECT id FROM sentences WHERE resource_id = ? AND normalized = ?",
                params![&candidate.resource_id, normalized],
                |row| row.get(0),
            )
            .optional()?;
        Ok(existing)
    }

    pub fn insert_occurrence(
        &self,
        target_id: &str,
        target_key: &str,
        signature: &str,
        sentence_id: i64,
        match_kind: &str,
        score: i64,
    ) -> Result<bool> {
        let inserted = self.con.execute(
            r#"
            INSERT OR IGNORE INTO occurrences(
              target_id, target_key, signature, sentence_id, match_kind, score
            )
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
            params![
                target_id,
                target_key,
                signature,
                sentence_id,
                match_kind,
                score
            ],
        )?;
        Ok(inserted == 1)
    }

    pub fn occurrence_counts(&self) -> Result<std::collections::HashMap<String, usize>> {
        let mut counts = std::collections::HashMap::new();
        let mut stmt = self
            .con
            .prepare("SELECT target_id, count(*) FROM occurrences GROUP BY target_id")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, usize>(1)?))
        })?;
        for row in rows {
            let (target_id, count) = row?;
            counts.insert(target_id, count);
        }
        Ok(counts)
    }

    pub fn write_counts(&self) -> Result<(i64, i64)> {
        let sentence_count: i64 =
            self.con
                .query_row("SELECT count(*) FROM sentences", [], |row| row.get(0))?;
        let occurrence_count: i64 =
            self.con
                .query_row("SELECT count(*) FROM occurrences", [], |row| row.get(0))?;
        self.con.execute(
            "INSERT OR REPLACE INTO metadata(key, value) VALUES ('sentence_count', ?)",
            params![sentence_count.to_string()],
        )?;
        self.con.execute(
            "INSERT OR REPLACE INTO metadata(key, value) VALUES ('occurrence_count', ?)",
            params![occurrence_count.to_string()],
        )?;
        Ok((sentence_count, occurrence_count))
    }
}

fn remove_sidecar(path: &Path, suffix: &str) -> Result<()> {
    let sidecar = PathBuf::from(format!("{}-{suffix}", path.display()));
    match fs::remove_file(sidecar) {
        Ok(()) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(err) => Err(err.into()),
    }
}

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  source_url TEXT,
  local_path TEXT NOT NULL,
  license TEXT
);

CREATE TABLE IF NOT EXISTS targets (
  id TEXT PRIMARY KEY,
  target_key TEXT NOT NULL,
  display_form TEXT NOT NULL,
  signature TEXT NOT NULL,
  anc_query TEXT NOT NULL,
  anc_tags_json TEXT NOT NULL,
  cell_label TEXT NOT NULL,
  verb_id TEXT NOT NULL,
  lemma TEXT NOT NULL,
  translation_en TEXT NOT NULL,
  options_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sentences (
  id INTEGER PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES resources(id),
  doc_id TEXT,
  title TEXT,
  url TEXT,
  domain TEXT,
  genre TEXT,
  quality TEXT,
  sentence TEXT NOT NULL,
  normalized TEXT NOT NULL,
  flags_json TEXT NOT NULL,
  UNIQUE(resource_id, normalized)
);

CREATE VIRTUAL TABLE IF NOT EXISTS sentence_fts USING fts5(
  sentence,
  normalized,
  content='sentences',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 0'
);

CREATE TABLE IF NOT EXISTS occurrences (
  id INTEGER PRIMARY KEY,
  target_id TEXT NOT NULL REFERENCES targets(id),
  target_key TEXT NOT NULL,
  signature TEXT NOT NULL,
  sentence_id INTEGER NOT NULL REFERENCES sentences(id),
  match_kind TEXT NOT NULL,
  score INTEGER NOT NULL,
  UNIQUE(target_id, sentence_id)
);

CREATE INDEX IF NOT EXISTS idx_occurrences_target_key ON occurrences(target_key);
CREATE INDEX IF NOT EXISTS idx_occurrences_signature ON occurrences(signature);
CREATE INDEX IF NOT EXISTS idx_occurrences_sentence ON occurrences(sentence_id);
CREATE INDEX IF NOT EXISTS idx_sentences_resource ON sentences(resource_id);
"#;
