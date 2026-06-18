#!/usr/bin/env python3
"""Populate local example occurrences from an existing SQLite FTS index."""

from __future__ import annotations

import argparse
import json
import sqlite3
import time
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / ".cache" / "corpus-local-full.sqlite"
DEFAULT_TARGETS = ROOT / ".cache" / "corpus-example-targets.json"


def args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=str(DEFAULT_DB))
    parser.add_argument("--targets", default=str(DEFAULT_TARGETS))
    parser.add_argument("--max-per-target", type=int, default=5)
    parser.add_argument("--candidate-multiplier", type=int, default=8)
    parser.add_argument("--surfaces", default="")
    parser.add_argument("--limit-surfaces", type=int, default=0)
    return parser.parse_args()


def quote_fts(text: str) -> str:
    return f'"{text.replace(chr(34), chr(34) * 2)}"'


def contiguous(tokens: list[str], needle: list[str]) -> bool:
    if not needle or len(needle) > len(tokens):
        return False
    width = len(needle)
    return any(tokens[i : i + width] == needle for i in range(len(tokens) - width + 1))


def score(row: sqlite3.Row, phrase: bool) -> int:
    source_bonus = {
        "macocu-sq-1.0-xml": 18,
        "macocu-genre-sq": 15,
        "seeuniversity-albanian-corpora-bert": 4,
        "cc100-sq": 0,
    }.get(row["resource_id"], 0)
    quality_bonus = 10 if row["quality"] == "good" else 6 if row["quality"] == "neargood" else 0
    return (100 if phrase else 78) + source_bonus + quality_bonus


def load_targets(path: Path, surfaces: set[str]) -> dict[str, list[dict[str, Any]]]:
    rows = json.loads(path.read_text("utf8"))["targets"]
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        key = row["targetKey"]
        if surfaces and key not in surfaces:
            continue
        grouped.setdefault(key, []).append(row)
    return grouped


def insert_targets(con: sqlite3.Connection, groups: dict[str, list[dict[str, Any]]]) -> None:
    con.execute("DELETE FROM occurrences")
    con.execute("DELETE FROM targets")
    rows = [row for group in groups.values() for row in group]
    con.executemany(
        """
        INSERT INTO targets(
          id, target_key, display_form, signature, anc_query, anc_tags_json,
          cell_label, verb_id, lemma, translation_en, options_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                row["id"],
                row["targetKey"],
                row["displayForm"],
                row["signature"],
                row["ancQuery"],
                json.dumps(row["ancTags"], ensure_ascii=False),
                row["cellLabel"],
                row["verbId"],
                row["lemma"],
                row["translationEn"],
                json.dumps(row["options"], ensure_ascii=False),
            )
            for row in rows
        ],
    )


def main() -> None:
    opts = args()
    db = Path(opts.db)
    targets = Path(opts.targets)
    if not db.exists():
        raise SystemExit(f"Missing DB: {db}")
    if not targets.exists():
        raise SystemExit(f"Missing targets: {targets}")

    wanted = {s.strip() for s in opts.surfaces.split(",") if s.strip()}
    groups = load_targets(targets, wanted)
    if opts.limit_surfaces:
        keep = set(sorted(groups)[: opts.limit_surfaces])
        groups = {key: value for key, value in groups.items() if key in keep}
    if not groups:
        raise SystemExit("No targets to materialize")

    con = sqlite3.connect(db)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA synchronous=NORMAL")
    con.execute("PRAGMA temp_store=MEMORY")
    insert_targets(con, groups)
    con.commit()

    find = con.cursor()
    find_sql = """
      SELECT s.id, s.resource_id, s.normalized, s.quality
      FROM sentence_fts
      JOIN sentences s ON s.id = sentence_fts.rowid
      WHERE sentence_fts MATCH ?
        AND s.flags_json NOT LIKE '%reference_prose%'
        AND s.flags_json NOT LIKE '%inflection_list%'
        AND s.flags_json NOT LIKE '%adult_or_spam%'
      ORDER BY bm25(sentence_fts), length(s.sentence), s.id
      LIMIT ?
    """

    start = time.perf_counter()
    con.execute("BEGIN")
    for index, (key, rows) in enumerate(sorted(groups.items()), start=1):
        needle = rows[0]["tokens"]
        phrase = len(needle) > 1
        limit = max(opts.max_per_target * opts.candidate_multiplier, 10)
        matches: list[sqlite3.Row] = []
        seen_normalized: set[str] = set()
        for row in find.execute(find_sql, (quote_fts(key), limit)):
            normalized = str(row["normalized"])
            if normalized in seen_normalized:
                continue
            if contiguous(normalized.split(), needle):
                seen_normalized.add(normalized)
                matches.append(row)
            if len(matches) >= opts.max_per_target:
                break
        kind = "exact_phrase" if phrase else "exact_token"
        for target in rows:
            for row in matches:
                con.execute(
                    """
                    INSERT OR IGNORE INTO occurrences(
                      target_id, target_key, signature, sentence_id, match_kind, score
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        target["id"],
                        target["targetKey"],
                        target["signature"],
                        row["id"],
                        kind,
                        score(row, phrase),
                    ),
                )
        if index % 5000 == 0:
            elapsed = max(time.perf_counter() - start, 0.001)
            print(f"  {index:,}/{len(groups):,} surfaces, {index / elapsed:,.0f}/s")
    con.commit()

    sentence_count = con.execute("SELECT count(*) FROM sentences").fetchone()[0]
    occurrence_count = con.execute("SELECT count(*) FROM occurrences").fetchone()[0]
    con.execute(
        "INSERT OR REPLACE INTO metadata(key, value) VALUES ('sentence_count', ?)",
        (str(sentence_count),),
    )
    con.execute(
        "INSERT OR REPLACE INTO metadata(key, value) VALUES ('occurrence_count', ?)",
        (str(occurrence_count),),
    )
    con.commit()
    elapsed = max(time.perf_counter() - start, 0.001)
    print(
        f"Materialized {len(groups):,} surfaces and {occurrence_count:,} occurrences "
        f"in {elapsed:.1f}s ({len(groups) / elapsed:,.0f} surfaces/s)"
    )


if __name__ == "__main__":
    main()
