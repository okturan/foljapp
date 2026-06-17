#!/usr/bin/env python3
"""Build a local SQLite FTS5 example index from downloaded Albanian corpora.

The database is a local artifact under .cache by default. It is intentionally
not suitable for Cloudflare Pages; the app reads it only during local dev.

Typical flow:
  npx tsx scripts/build-corpus-example-targets.ts --forms=punoj,"të punoj",punuakam
  python3 scripts/build-local-corpus-examples.py --stop-when-satisfied
"""

from __future__ import annotations

import argparse
import gzip
import json
import lzma
import re
import sqlite3
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Iterator


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGETS = REPO_ROOT / ".cache" / "corpus-example-targets.json"
DEFAULT_OUT = REPO_ROOT / ".cache" / "corpus-examples.sqlite"
RESOURCE_INVENTORY = REPO_ROOT / "data" / "corpora" / "resources.json"

TOKEN_RE = re.compile(r"\w+", re.UNICODE)
SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?…])\s+|\n+")
WHITESPACE_RE = re.compile(r"\s+")
TAG_RE = re.compile(r"<[^>]+>")
ADULT_OR_SPAM_TERMS = {
    "anal",
    "blowjob",
    "boobs",
    "cumshot",
    "deepthroat",
    "dildo",
    "fetish",
    "hardcore",
    "lezbike",
    "lesbian",
    "lesbo",
    "masturb",
    "orgazm",
    "pidhi",
    "porn",
    "porno",
    "rrip-në",
    "seksi",
    "strapon",
}
REFERENCE_PROSE_HINTS = {
    "conjugation",
    "declension",
    "first-person",
    "grammar",
    "indicative",
    "participle",
    "subjunctive",
    "veta e",
    "koha e",
    "mënyra",
    "pjesorja",
    "e ardhmja",
    "e caktuar",
    "e pacaktuar",
    "e tashmja",
}
INFLECTION_LIST_RE = re.compile(r"\bdo\s+të\s+\w+\s+do\s+të\s+\w+", re.IGNORECASE)


@dataclass(frozen=True)
class Target:
    id: str
    target_key: str
    display_form: str
    tokens: tuple[str, ...]
    signature: str
    anc_query: str
    anc_tags: str
    cell_label: str
    verb_id: str
    lemma: str
    translation_en: str
    options_json: str


@dataclass(frozen=True)
class CandidateSentence:
    resource_id: str
    doc_id: str | None
    title: str | None
    url: str | None
    domain: str | None
    genre: str | None
    quality: str | None
    sentence: str
    normalized: str
    flags: tuple[str, ...]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets", default=str(DEFAULT_TARGETS))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument(
        "--sources",
        default="macocu-xml,macocu-genre",
        help=(
            "Comma-separated resource ids, or 'all'. Known ids: "
            "macocu-xml, macocu-genre, cc100, seeuniversity"
        ),
    )
    parser.add_argument("--max-per-target", type=int, default=8)
    parser.add_argument(
        "--max-sentences-per-source",
        type=int,
        default=0,
        help="0 means no cap. Counts inserted clean sentences, not raw rows.",
    )
    parser.add_argument(
        "--stop-when-satisfied",
        action="store_true",
        help="Stop a source once every target has --max-per-target occurrences.",
    )
    parser.add_argument(
        "--matched-only",
        action="store_true",
        help="Store only sentences matching at least one generated target.",
    )
    parser.add_argument(
        "--append",
        action="store_true",
        help="Append to an existing DB instead of replacing it.",
    )
    return parser.parse_args()


def normalize_token(token: str) -> str:
    return token.casefold().strip()


def tokens_for(text: str) -> list[str]:
    return [normalize_token(t) for t in TOKEN_RE.findall(text)]


def normalize_text(text: str) -> str:
    return " ".join(tokens_for(text))


def clean_text(text: str) -> str:
    return WHITESPACE_RE.sub(" ", text.replace("\u00a0", " ")).strip()


def split_sentences(text: str) -> Iterator[str]:
    for chunk in SENTENCE_SPLIT_RE.split(text):
        chunk = clean_text(chunk)
        if chunk:
            yield chunk


def quality_flags(sentence: str, normalized: str, quality: str | None) -> tuple[str, ...]:
    flags: list[str] = []
    lower = sentence.casefold()
    if quality and quality not in {"good", "neargood"}:
        flags.append("low_quality")
    if any(term in lower for term in ADULT_OR_SPAM_TERMS):
        flags.append("adult_or_spam")
    if TAG_RE.search(sentence) or "&lt;" in sentence or "&gt;" in sentence:
        flags.append("markup")
    if any(hint in lower for hint in REFERENCE_PROSE_HINTS):
        flags.append("reference_prose")
    if any(ord(ch) < 32 and ch not in "\t\n\r" for ch in sentence):
        flags.append("control_char")
    if sentence.count(",") >= 3 and len(tokens_for(normalized)) <= 18:
        flags.append("inflection_list")
    if INFLECTION_LIST_RE.search(lower):
        flags.append("inflection_list")
    if len(tokens_for(normalized)) < 4:
        flags.append("too_short")
    if len(sentence) > 420:
        flags.append("too_long")
    if sum(1 for ch in sentence if ch.isdigit()) > 12:
        flags.append("digit_heavy")
    return tuple(flags)


def keep_sentence(flags: tuple[str, ...]) -> bool:
    hard_reject = {
        "adult_or_spam",
        "markup",
        "too_short",
        "too_long",
        "digit_heavy",
        "inflection_list",
        "control_char",
        "reference_prose",
    }
    return not any(flag in hard_reject for flag in flags)


def load_resources() -> dict[str, dict[str, Any]]:
    raw = json.loads(RESOURCE_INVENTORY.read_text("utf8"))
    by_id: dict[str, dict[str, Any]] = {}
    for resource in raw["resources"]:
        local = resource.get("localPath")
        if not local:
            continue
        by_id[resource["id"]] = resource
    return by_id


def load_targets(path: Path) -> list[Target]:
    raw = json.loads(path.read_text("utf8"))
    targets: list[Target] = []
    for row in raw["targets"]:
        targets.append(
            Target(
                id=row["id"],
                target_key=row["targetKey"],
                display_form=row["displayForm"],
                tokens=tuple(row["tokens"]),
                signature=row["signature"],
                anc_query=row["ancQuery"],
                anc_tags=json.dumps(row["ancTags"], ensure_ascii=False),
                cell_label=row["cellLabel"],
                verb_id=row["verbId"],
                lemma=row["lemma"],
                translation_en=row["translationEn"],
                options_json=json.dumps(row["options"], ensure_ascii=False),
            )
        )
    return targets


def source_ids(raw_sources: str) -> list[str]:
    aliases = {
        "macocu-xml": "macocu-sq-1.0-xml",
        "macocu-genre": "macocu-genre-sq",
        "cc100": "cc100-sq",
        "seeuniversity": "seeuniversity-albanian-corpora-bert",
    }
    if raw_sources == "all":
        return list(aliases.values())
    ids = []
    for raw in raw_sources.split(","):
        key = raw.strip()
        if not key:
            continue
        ids.append(aliases.get(key, key))
    return ids


def init_db(
    db_path: Path,
    resources: dict[str, dict[str, Any]],
    targets: list[Target],
    append: bool,
) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    existed_before = db_path.exists()
    if existed_before and not append:
        db_path.unlink()
        existed_before = False
    con = sqlite3.connect(db_path)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    if not existed_before:
        con.executescript(
            """
            CREATE TABLE metadata (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );

            CREATE TABLE resources (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              kind TEXT NOT NULL,
              source_url TEXT,
              local_path TEXT NOT NULL,
              license TEXT
            );

            CREATE TABLE targets (
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

            CREATE TABLE sentences (
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

            CREATE VIRTUAL TABLE sentence_fts USING fts5(
              sentence,
              normalized,
              content='sentences',
              content_rowid='id',
              tokenize='unicode61 remove_diacritics 0'
            );

            CREATE TABLE occurrences (
              id INTEGER PRIMARY KEY,
              target_id TEXT NOT NULL REFERENCES targets(id),
              target_key TEXT NOT NULL,
              signature TEXT NOT NULL,
              sentence_id INTEGER NOT NULL REFERENCES sentences(id),
              match_kind TEXT NOT NULL,
              score INTEGER NOT NULL,
              UNIQUE(target_id, sentence_id)
            );

            CREATE INDEX idx_occurrences_target_key ON occurrences(target_key);
            CREATE INDEX idx_occurrences_signature ON occurrences(signature);
            CREATE INDEX idx_occurrences_sentence ON occurrences(sentence_id);
            CREATE INDEX idx_sentences_resource ON sentences(resource_id);
            """
        )
    con.execute(
        "INSERT OR REPLACE INTO metadata(key, value) VALUES (?, ?)",
        ("schema_version", "1"),
    )
    con.executemany(
        """
        INSERT OR IGNORE INTO resources(id, title, kind, source_url, local_path, license)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        [
            (
                rid,
                row.get("title", rid),
                row.get("kind", ""),
                row.get("sourceUrl"),
                row["localPath"],
                row.get("license"),
            )
            for rid, row in resources.items()
        ],
    )
    con.executemany(
        """
        INSERT OR IGNORE INTO targets(
          id, target_key, display_form, signature, anc_query, anc_tags_json,
          cell_label, verb_id, lemma, translation_en, options_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                t.id,
                t.target_key,
                t.display_form,
                t.signature,
                t.anc_query,
                t.anc_tags,
                t.cell_label,
                t.verb_id,
                t.lemma,
                t.translation_en,
                t.options_json,
            )
            for t in targets
        ],
    )
    con.commit()
    return con


def iter_macocu_genre(path: Path, resource_id: str) -> Iterator[CandidateSentence]:
    with gzip.open(path, "rt", encoding="utf8", errors="replace") as fh:
        for raw in fh:
            if not raw.strip():
                continue
            doc = json.loads(raw)
            for sentence in split_sentences(doc.get("text") or ""):
                normalized = normalize_text(sentence)
                flags = quality_flags(sentence, normalized, "good")
                yield CandidateSentence(
                    resource_id=resource_id,
                    doc_id=str(doc.get("id") or ""),
                    title=doc.get("title"),
                    url=doc.get("url"),
                    domain=doc.get("domain"),
                    genre=doc.get("genre"),
                    quality="good",
                    sentence=sentence,
                    normalized=normalized,
                    flags=flags,
                )


def iter_macocu_xml(path: Path, resource_id: str) -> Iterator[CandidateSentence]:
    with zipfile.ZipFile(path) as zf:
        xml_name = next(name for name in zf.namelist() if name.endswith(".xml"))
        with zf.open(xml_name) as fh:
            current_doc: dict[str, str] = {}
            for event, elem in ET.iterparse(fh, events=("start", "end")):
                if event == "start" and elem.tag == "doc":
                    current_doc = dict(elem.attrib)
                elif event == "end" and elem.tag == "p":
                    text = clean_text("".join(elem.itertext()))
                    quality = elem.attrib.get("quality")
                    lang = elem.attrib.get("lang")
                    if text and (lang in {None, "", "sq"}):
                        for sentence in split_sentences(text):
                            normalized = normalize_text(sentence)
                            flags = quality_flags(sentence, normalized, quality)
                            yield CandidateSentence(
                                resource_id=resource_id,
                                doc_id=current_doc.get("id"),
                                title=current_doc.get("title"),
                                url=current_doc.get("url"),
                                domain=current_doc.get("domain"),
                                genre=None,
                                quality=quality,
                                sentence=sentence,
                                normalized=normalized,
                                flags=flags,
                            )
                    elem.clear()
                elif event == "end" and elem.tag == "doc":
                    current_doc = {}
                    elem.clear()


def iter_cc100(path: Path, resource_id: str) -> Iterator[CandidateSentence]:
    with lzma.open(path, "rt", encoding="utf8", errors="replace") as fh:
        for line_number, raw in enumerate(fh, start=1):
            for sentence in split_sentences(raw):
                normalized = normalize_text(sentence)
                flags = quality_flags(sentence, normalized, None)
                yield CandidateSentence(
                    resource_id=resource_id,
                    doc_id=str(line_number),
                    title=None,
                    url=None,
                    domain=None,
                    genre=None,
                    quality=None,
                    sentence=sentence,
                    normalized=normalized,
                    flags=flags,
                )


def iter_seeuniversity(path: Path, resource_id: str) -> Iterator[CandidateSentence]:
    with path.open("rt", encoding="utf8", errors="replace") as fh:
        for line_number, raw in enumerate(fh, start=1):
            for sentence in split_sentences(raw):
                normalized = normalize_text(sentence)
                flags = quality_flags(sentence, normalized, None)
                yield CandidateSentence(
                    resource_id=resource_id,
                    doc_id=str(line_number),
                    title=None,
                    url="https://huggingface.co/datasets/SEEUniversity/albanian_corpora_bert",
                    domain="huggingface.co",
                    genre=None,
                    quality=None,
                    sentence=sentence,
                    normalized=normalized,
                    flags=flags,
                )


def grep_pattern_for_targets(targets: Iterable[Target]) -> str:
    keys = {target.target_key for target in targets if target.target_key}
    return "|".join(re.escape(key) for key in sorted(keys, key=len, reverse=True))


def iter_prefiltered_line_source(
    path: Path,
    resource_id: str,
    targets: list[Target],
) -> Iterator[CandidateSentence]:
    pattern = grep_pattern_for_targets(targets)
    if not pattern:
        return

    if resource_id == "cc100-sq":
        decompressor = subprocess.Popen(
            ["xz", "-cd", str(path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            errors="replace",
        )
        assert decompressor.stdout is not None
        grep = subprocess.Popen(
            ["rg", "--text", "-n", "-i", "-e", pattern],
            stdin=decompressor.stdout,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            errors="replace",
        )
        decompressor.stdout.close()
    elif resource_id == "seeuniversity-albanian-corpora-bert":
        decompressor = None
        grep = subprocess.Popen(
            ["rg", "--text", "-n", "-i", "-e", pattern, str(path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            errors="replace",
        )
    else:
        yield from iter_source({"id": resource_id, "localPath": str(path)})
        return

    assert grep.stdout is not None
    for raw in grep.stdout:
        if ":" not in raw:
            continue
        line_number, text = raw.split(":", 1)
        for sentence in split_sentences(text):
            normalized = normalize_text(sentence)
            flags = quality_flags(sentence, normalized, None)
            yield CandidateSentence(
                resource_id=resource_id,
                doc_id=line_number,
                title=None,
                url=(
                    "https://huggingface.co/datasets/SEEUniversity/albanian_corpora_bert"
                    if resource_id == "seeuniversity-albanian-corpora-bert"
                    else None
                ),
                domain=(
                    "huggingface.co"
                    if resource_id == "seeuniversity-albanian-corpora-bert"
                    else None
                ),
                genre=None,
                quality=None,
                sentence=sentence,
                normalized=normalized,
                flags=flags,
            )

    grep_code = grep.wait()
    if decompressor is not None:
        decompressor.wait()
    if grep_code not in {0, 1}:
        stderr = grep.stderr.read() if grep.stderr else ""
        raise RuntimeError(f"rg prefilter failed for {resource_id}: {stderr}")


def iter_source(resource: dict[str, Any]) -> Iterator[CandidateSentence]:
    resource_id = resource["id"]
    path = REPO_ROOT / resource["localPath"]
    if resource_id == "macocu-genre-sq":
        yield from iter_macocu_genre(path, resource_id)
    elif resource_id == "macocu-sq-1.0-xml":
        yield from iter_macocu_xml(path, resource_id)
    elif resource_id == "cc100-sq":
        yield from iter_cc100(path, resource_id)
    elif resource_id == "seeuniversity-albanian-corpora-bert":
        yield from iter_seeuniversity(path, resource_id)
    else:
        raise ValueError(f"Unsupported local resource: {resource_id}")


def compile_targets(targets: Iterable[Target]) -> dict[str, list[Target]]:
    by_first: dict[str, list[Target]] = defaultdict(list)
    for target in targets:
        if not target.tokens:
            continue
        by_first[target.tokens[0]].append(target)
    return by_first


def target_matches(tokens: list[str], by_first: dict[str, list[Target]]) -> list[tuple[Target, str]]:
    matches: list[tuple[Target, str]] = []
    for index, token in enumerate(tokens):
        for target in by_first.get(token, []):
            width = len(target.tokens)
            if tuple(tokens[index : index + width]) == target.tokens:
                matches.append((target, "exact_phrase" if width > 1 else "exact_token"))
    return matches


def source_bonus(resource_id: str) -> int:
    return {
        "macocu-sq-1.0-xml": 18,
        "macocu-genre-sq": 15,
        "seeuniversity-albanian-corpora-bert": 4,
        "cc100-sq": 0,
    }.get(resource_id, 0)


def score_sentence(candidate: CandidateSentence, match_kind: str) -> int:
    score = 100 if match_kind == "exact_phrase" else 78
    score += source_bonus(candidate.resource_id)
    if candidate.quality == "good":
        score += 10
    elif candidate.quality == "neargood":
        score += 6
    if candidate.url:
        score += 4
    if candidate.domain:
        score += 2
    if "reference_prose" in candidate.flags:
        score -= 30
    if "low_quality" in candidate.flags:
        score -= 12
    token_count = len(candidate.normalized.split())
    if 7 <= token_count <= 28:
        score += 8
    elif token_count > 45:
        score -= 8
    return score


def insert_sentence(con: sqlite3.Connection, candidate: CandidateSentence) -> int | None:
    flags_json = json.dumps(candidate.flags, ensure_ascii=False)
    try:
        cur = con.execute(
            """
            INSERT INTO sentences(
              resource_id, doc_id, title, url, domain, genre, quality,
              sentence, normalized, flags_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                candidate.resource_id,
                candidate.doc_id,
                candidate.title,
                candidate.url,
                candidate.domain,
                candidate.genre,
                candidate.quality,
                candidate.sentence,
                candidate.normalized,
                flags_json,
            ),
        )
    except sqlite3.IntegrityError:
        row = con.execute(
            "SELECT id FROM sentences WHERE resource_id = ? AND normalized = ?",
            (candidate.resource_id, candidate.normalized),
        ).fetchone()
        return int(row[0]) if row else None
    sentence_id = int(cur.lastrowid)
    con.execute(
        "INSERT INTO sentence_fts(rowid, sentence, normalized) VALUES (?, ?, ?)",
        (sentence_id, candidate.sentence, candidate.normalized),
    )
    return sentence_id


def insert_occurrences(
    con: sqlite3.Connection,
    sentence_id: int,
    candidate: CandidateSentence,
    matches: list[tuple[Target, str]],
    counts: dict[str, int],
    max_per_target: int,
) -> int:
    added = 0
    for target, match_kind in matches:
        if counts[target.id] >= max_per_target:
            continue
        score = score_sentence(candidate, match_kind)
        try:
            con.execute(
                """
                INSERT INTO occurrences(
                  target_id, target_key, signature, sentence_id, match_kind, score
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    target.id,
                    target.target_key,
                    target.signature,
                    sentence_id,
                    match_kind,
                    score,
                ),
            )
        except sqlite3.IntegrityError:
            continue
        counts[target.id] += 1
        added += 1
    return added


def all_satisfied(counts: dict[str, int], targets: list[Target], max_per_target: int) -> bool:
    return all(counts[target.id] >= max_per_target for target in targets)


def build_index(args: argparse.Namespace) -> None:
    targets_path = Path(args.targets)
    if not targets_path.exists():
        raise SystemExit(
            f"Missing target file: {targets_path}\n"
            "Run: npx tsx scripts/build-corpus-example-targets.ts"
        )

    all_resources = load_resources()
    selected_ids = source_ids(args.sources)
    selected_resources = {
        rid: all_resources[rid]
        for rid in selected_ids
        if rid in all_resources and Path(REPO_ROOT / all_resources[rid]["localPath"]).exists()
    }
    missing = [rid for rid in selected_ids if rid not in selected_resources]
    if missing:
        print(f"Skipping missing resources: {', '.join(missing)}", file=sys.stderr)

    targets = load_targets(targets_path)
    if not targets:
        raise SystemExit(f"No targets in {targets_path}")

    db_path = Path(args.out)
    con = init_db(db_path, selected_resources, targets, args.append)
    by_first = compile_targets(targets)
    counts: dict[str, int] = defaultdict(int)
    for target_id, count in con.execute(
        "SELECT target_id, count(*) FROM occurrences GROUP BY target_id"
    ):
        counts[str(target_id)] = int(count)
    total_sentences = 0
    total_occurrences = 0

    for resource_id, resource in selected_resources.items():
        inserted_for_source = 0
        raw_seen = 0
        print(f"Scanning {resource_id}...", flush=True)
        use_prefilter = (
            args.matched_only
            and resource_id
            in {"cc100-sq", "seeuniversity-albanian-corpora-bert"}
            and len(targets) <= 100
        )
        candidates = (
            iter_prefiltered_line_source(
                REPO_ROOT / resource["localPath"],
                resource_id,
                targets,
            )
            if use_prefilter
            else iter_source({**resource, "id": resource_id})
        )
        with con:
            for candidate in candidates:
                raw_seen += 1
                if raw_seen % 100_000 == 0:
                    print(
                        f"  {raw_seen:,} candidates, {inserted_for_source:,} stored, "
                        f"{total_occurrences:,} occurrences",
                        flush=True,
                    )
                if not keep_sentence(candidate.flags):
                    continue

                matches = target_matches(candidate.normalized.split(), by_first)
                viable_matches = [
                    match
                    for match in matches
                    if counts[match[0].id] < args.max_per_target
                ]
                if args.matched_only and not viable_matches:
                    continue

                sentence_id = insert_sentence(con, candidate)
                if sentence_id is None:
                    continue
                inserted_for_source += 1
                total_sentences += 1

                if viable_matches:
                    total_occurrences += insert_occurrences(
                        con,
                        sentence_id,
                        candidate,
                        viable_matches,
                        counts,
                        args.max_per_target,
                    )

                if (
                    args.max_sentences_per_source
                    and inserted_for_source >= args.max_sentences_per_source
                ):
                    break
                if args.stop_when_satisfied and all_satisfied(
                    counts, targets, args.max_per_target
                ):
                    break
        print(
            f"  stored {inserted_for_source:,} sentence(s) from {resource_id}",
            flush=True,
        )

    final_sentence_count = int(con.execute("SELECT count(*) FROM sentences").fetchone()[0])
    final_occurrence_count = int(
        con.execute("SELECT count(*) FROM occurrences").fetchone()[0]
    )
    con.execute(
        "INSERT OR REPLACE INTO metadata(key, value) VALUES (?, ?)",
        ("sentence_count", str(final_sentence_count)),
    )
    con.execute(
        "INSERT OR REPLACE INTO metadata(key, value) VALUES (?, ?)",
        ("occurrence_count", str(final_occurrence_count)),
    )
    con.commit()
    con.close()
    print(
        f"Wrote {db_path} with {final_sentence_count:,} sentence(s) and "
        f"{final_occurrence_count:,} occurrence(s)"
    )


if __name__ == "__main__":
    build_index(parse_args())
