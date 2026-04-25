#!/usr/bin/env python3
"""
Parse Geoff Husić's *Albanian Verb Dictionary and Manual* (KU ScholarWorks
PDF, 234 pages, OpenOffice-generated) into per-verb JSONL files matching
verify-engine.ts's expected shape.

Source: https://kuscholarworks.ku.edu/handle/1808/1661 (open access).

Output: .cache/husic/<id>.jsonl per verb, where <id> is the ASCII-folded
lemma. Each line is a JSON record `{"form": "...", "tags": [...]}` with
tags aligned to the engine's namespace (matches Kaikki convention so
verify-engine's findHusicForm shares filter logic).

Usage:
    python3 scripts/parse-husic-pdf.py /path/to/husic.pdf
    python3 scripts/parse-husic-pdf.py /path/to/husic.pdf --only-verb bej
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = REPO_ROOT / ".cache" / "husic"

# Known mood headings (uppercase in source).
MOOD_HEADINGS = {
    "INDICATIVE", "SUBJUNCTIVE", "CONDITIONAL", "OPTATIVE",
    "ADMIRATIVE", "IMPERATIVE", "INFINITIVE", "GERUNDIVE", "PARTICIPLE",
}

# Husić tense label → engine (mood, tense). None means skip (continuous, etc.).
TENSE_MAP: dict[str, tuple[str, str] | None] = {
    # Indicative
    "Present": ("indicative", "present"),
    "Continuous present": None,
    "Imperfect": ("indicative", "imperfect"),
    "Continuous imperfect": None,
    "Aorist": ("indicative", "aorist"),
    "Perfect": ("indicative", "perfect"),
    "Past perfect I": ("indicative", "pluperfect"),
    "Past perfect II": ("indicative", "past-anterior"),
    "Future I": ("indicative", "future"),
    "Future II": None,  # alternative `kam për të + participle` construction
    "Future perfect I": ("indicative", "future-perfect"),
    "Future perfect II": None,
    # Future-in-past variants — Husić labels them differently per verb
    # We add them dynamically below
}

# Per-mood overrides (Husić uses the same tense label across moods, but
# the (mood, tense) pair differs. We track mood context while parsing.)
MOOD_TENSE_MAP: dict[tuple[str, str], tuple[str, str]] = {
    ("INDICATIVE", "Present"): ("indicative", "present"),
    ("INDICATIVE", "Imperfect"): ("indicative", "imperfect"),
    ("INDICATIVE", "Aorist"): ("indicative", "aorist"),
    ("INDICATIVE", "Perfect"): ("indicative", "perfect"),
    ("INDICATIVE", "Past perfect I"): ("indicative", "pluperfect"),
    ("INDICATIVE", "Past perfect II"): ("indicative", "past-anterior"),
    ("INDICATIVE", "Future I"): ("indicative", "future"),
    ("INDICATIVE", "Future perfect I"): ("indicative", "future-perfect"),
    ("INDICATIVE", "Future in past"): ("indicative", "future-in-past"),
    ("INDICATIVE", "Future perfect in past"): ("indicative", "future-perfect-in-past"),

    ("SUBJUNCTIVE", "Present"): ("subjunctive", "present"),
    ("SUBJUNCTIVE", "Imperfect"): ("subjunctive", "imperfect"),
    ("SUBJUNCTIVE", "Perfect"): ("subjunctive", "perfect"),
    ("SUBJUNCTIVE", "Past perfect"): ("subjunctive", "pluperfect"),

    ("CONDITIONAL", "Present"): ("conditional", "present"),
    ("CONDITIONAL", "Perfect"): ("conditional", "perfect"),

    ("OPTATIVE", "Present"): ("optative", "present"),
    ("OPTATIVE", "Perfect"): ("optative", "perfect"),

    ("ADMIRATIVE", "Present"): ("admirative", "present"),
    ("ADMIRATIVE", "Imperfect"): ("admirative", "imperfect"),
    ("ADMIRATIVE", "Perfect"): ("admirative", "perfect"),
    # Husić has a typo "Past prefect" for some verbs; handle both.
    ("ADMIRATIVE", "Past perfect"): ("admirative", "pluperfect"),
    ("ADMIRATIVE", "Past prefect"): ("admirative", "pluperfect"),
}

PERSON_NUMBER = [
    (1, "singular"),
    (2, "singular"),
    (3, "singular"),
    (1, "plural"),
    (2, "plural"),
    (3, "plural"),
]


def ascii_id(lemma: str) -> str:
    """Match the engine's ASCII-id convention (ë→e, ç→c)."""
    return lemma.replace("ë", "e").replace("ç", "c").replace("Ç", "c").replace("Ë", "e").lower()


def extract_text_pages(pdf_path: str) -> list[str]:
    from pypdf import PdfReader  # type: ignore[import-untyped]
    r = PdfReader(pdf_path)
    return [p.extract_text() or "" for p in r.pages]


# Verb-section header — matches `<lemma> '<gloss>'[; <mpForm> '<mpGloss>'] [class-info] (transitivity)`.
# Examples:
#   bëj 'to do, to make'; bëhem 'to be done, to become' I-II-3 (trans.)
#   bërtas 'to shout' II-II-2 (intrans.)
#   bie 'to fall' Irr. (intrans.)
# The lemma must be alphabetic + Albanian special chars; gloss is in single quotes.
VERB_HEADER_RE = re.compile(
    r"^(?P<lemma>[a-zëçáéíóúàèìòùâêîôûäöüA-ZËÇ]+)\s+"
    r"'(?P<gloss>[^']+)'"
    # Permissive middle: any number of additional MP form / gloss entries,
    # with or without comma/semi separators (Husić is inconsistent — some
    # entries use ; , or just whitespace between alternates).
    r".*?"
    r"\s+(?P<class>(?:Irr\.|[IV]+(?:-[IV]+)?(?:-\d+)?[a-z]?))"
    r"(?:\s*\((?P<transitivity>[a-z.]+)\))?\s*$",
    re.IGNORECASE,
)


def is_page_artifact(line: str) -> bool:
    s = line.strip()
    return (
        s == ""
        or s == "Back to Index"
        or re.fullmatch(r"\d+", s) is not None
        or re.fullmatch(r"[０-９]+", s) is not None  # full-width page numbers
    )


# Tense-line label set (the literal start-of-line label).
TENSE_LABELS_PATTERN = re.compile(
    r"^(?P<label>"
    r"Present|"
    r"Continuous present|"
    r"Imperfect|"
    r"Continuous imperfect|"
    r"Aorist|"
    r"Perfect|"
    r"Past perfect II|"
    r"Past perfect I|"
    r"Past perfect|"
    r"Past prefect|"
    r"Future perfect I|"
    r"Future perfect II|"
    r"Future I|"
    r"Future II|"
    r"Future"
    r"):\s*(?P<rest>.*)$"
)


def parse_verb_block(lines: list[str]) -> dict | None:
    """Parse a single verb's paradigm block.

    Returns {id, lemma, gloss, transitivity, forms: [{form, tags}]}.
    """
    if not lines:
        return None

    header = VERB_HEADER_RE.match(lines[0].strip())
    if not header:
        return None

    lemma = header.group("lemma").strip()
    gloss = header.group("gloss").strip()
    transitivity = header.group("transitivity") or ""

    forms: list[dict] = []
    mood_context = "INDICATIVE"  # default until first explicit heading
    pending_label: str | None = None
    pending_buf = ""

    def flush_pending(active_voice: bool) -> None:
        nonlocal pending_label, pending_buf
        if pending_label is None:
            return
        forms_list = split_forms(pending_buf)
        if forms_list:
            emit_tense_forms(forms, mood_context, pending_label, forms_list, active_voice=active_voice, lemma=lemma)
        pending_label = None
        pending_buf = ""

    i = 1
    while i < len(lines):
        raw = lines[i]
        line = raw.strip()
        i += 1

        if is_page_artifact(line):
            continue
        if line.upper() in MOOD_HEADINGS:
            flush_pending(active_voice=True)
            mood_context = line.upper()
            continue

        # Imperative is a special two-form line: "<2sg-active>; <2pl-active> <2sg-mp>; <2pl-mp>"
        if mood_context == "IMPERATIVE":
            # Forms are space-separated active block then MP block.
            # Try parsing: active part has "X; Y" then MP "X; Y".
            parts = re.findall(r"([^\s;]+);\s*([^\s;]+)", line)
            if parts:
                if len(parts) >= 1:
                    forms.append({"form": parts[0][0], "tags": tags_for_imperative(2, "singular", mp=False)})
                    forms.append({"form": parts[0][1], "tags": tags_for_imperative(2, "plural", mp=False)})
                if len(parts) >= 2:
                    forms.append({"form": parts[1][0], "tags": tags_for_imperative(2, "singular", mp=True)})
                    forms.append({"form": parts[1][1], "tags": tags_for_imperative(2, "plural", mp=True)})
            continue

        m = TENSE_LABELS_PATTERN.match(line)
        if m:
            flush_pending(active_voice=True)
            pending_label = m.group("label")
            pending_buf = m.group("rest")
            # Some lines contain both columns: "...forms... <Label>: ...mp forms..."
            # Detect the second label: scan pending_buf for another known label.
            second = re.search(r"\s+(?:Present|Imperfect|Aorist|Perfect|Past perfect (?:I+|)|Past prefect|Future(?:\s\w+)?(?:\sI+)?)\s*:\s*", pending_buf)
            if second:
                active_part = pending_buf[: second.start()].strip()
                mp_part = pending_buf[second.end():].strip()
                # Active forms
                af = split_forms(active_part)
                if af:
                    emit_tense_forms(forms, mood_context, pending_label, af, active_voice=True, lemma=lemma)
                # MP forms
                mp_label_match = re.match(r"\s+(.+?)\s*:\s*", pending_buf[second.start():])
                if mp_label_match:
                    mp_label = mp_label_match.group(1).strip()
                else:
                    mp_label = pending_label
                mpf = split_forms(mp_part)
                if mpf:
                    emit_tense_forms(forms, mood_context, mp_label, mpf, active_voice=False, lemma=lemma)
                pending_label = None
                pending_buf = ""
        else:
            # Continuation of pending tense line (forms wrapped to next line)
            if pending_label is not None:
                pending_buf += " " + line

    flush_pending(active_voice=True)
    return {
        "id": ascii_id(lemma),
        "lemma": lemma,
        "gloss": gloss,
        "transitivity": transitivity,
        "forms": forms,
    }


def split_forms(s: str) -> list[str]:
    """Split a comma-separated form list. Strip parenthetical variants
    (anywhere in the form, not just at the end — Husić uses inline parens
    like "qenkësh (qenkej) bërë" for variant alternates)."""
    out: list[str] = []
    for part in s.split(","):
        p = part.strip()
        if not p:
            continue
        # Strip ALL parenthetical alternates in the form.
        p = re.sub(r"\s*\([^)]*\)\s*", " ", p).strip()
        # Collapse multiple spaces from the strip.
        p = re.sub(r"\s+", " ", p)
        if p:
            out.append(p)
    return out


def tags_for_indicative(person: int, number: str, *, mood: str, tense: str, mp: bool) -> list[str]:
    """Build the tag set for a non-imperative cell, matching Kaikki conventions."""
    tags: set[str] = set()
    tags.add(mood)
    # Tense aliasing: Husić labels → Kaikki tags
    if tense == "present":
        tags.add("present")
    elif tense == "imperfect":
        tags.add("imperfect")
    elif tense == "aorist":
        tags.add("aorist")
    elif tense == "perfect":
        tags.add("perfect")
    elif tense == "pluperfect":
        # Kaikki convention: past + perfect
        tags.add("past")
        tags.add("perfect")
    elif tense == "past-anterior":
        tags.add("past-anterior")
    elif tense == "future":
        tags.add("future")
    elif tense == "future-perfect":
        tags.add("future")
        tags.add("perfect")
    elif tense == "future-in-past":
        tags.add("future-in-past")
    elif tense == "future-perfect-in-past":
        tags.add("future-perfect-in-past")

    # Conditional present — Kaikki tags as `imperfect + conditional`
    if mood == "conditional" and tense == "present":
        tags.discard("present")
        tags.add("imperfect")
    if mood == "conditional" and tense == "perfect":
        tags.discard("perfect")
        tags.add("past")
        tags.add("perfect")

    # Person/number
    if person == 1:
        tags.add("first-person")
    elif person == 2:
        tags.add("second-person")
    elif person == 3:
        tags.add("third-person")
    tags.add(number)

    if mp:
        tags.add("middle-passive")
    return sorted(tags)


def tags_for_imperative(person: int, number: str, *, mp: bool) -> list[str]:
    tags = {"imperative", "present"}
    if person == 2:
        tags.add("second-person")
    tags.add(number)
    if mp:
        tags.add("middle-passive")
    return sorted(tags)


def emit_tense_forms(
    forms: list[dict],
    mood_context: str,
    label: str,
    form_list: list[str],
    *,
    active_voice: bool,
    lemma: str,
) -> None:
    pair = MOOD_TENSE_MAP.get((mood_context, label))
    if pair is None:
        # Unhandled tense (e.g., Continuous present, Future II) — skip.
        return
    mood, tense = pair
    # form_list should have 6 items in order 1sg, 2sg, 3sg, 1pl, 2pl, 3pl.
    # If fewer (some verbs have shorter lists due to defectives), align by
    # position and skip missing.
    for i, form in enumerate(form_list[:6]):
        if not form:
            continue
        person, number = PERSON_NUMBER[i]
        forms.append(
            {
                "form": form,
                "tags": tags_for_indicative(person, number, mood=mood, tense=tense, mp=not active_voice),
            }
        )


def parse_full_text(full_text: str) -> Iterable[dict]:
    """Iterate over verb sections in the concatenated text."""
    lines = full_text.split("\n")
    # Find all verb-header line indices.
    header_indices: list[int] = []
    for i, line in enumerate(lines):
        if is_page_artifact(line):
            continue
        if VERB_HEADER_RE.match(line.strip()):
            header_indices.append(i)
    # Slice by adjacent header indices.
    for k, start in enumerate(header_indices):
        end = header_indices[k + 1] if k + 1 < len(header_indices) else len(lines)
        block = lines[start:end]
        result = parse_verb_block(block)
        if result is not None:
            yield result


# ---------- Alphabetical glossary parsing ----------------------------

# Glossary line format: "<lemma-with-stem-markers> <class-pattern> (like <model>) <english>"
# Examples:
#   "kërk[o]-j I-I-1a (like çliroj) seek"
#   "hap-0 II-I (like hap) open"
#   "godi{t/s}-0 II-I-1 (like godit) hit"
GLOSSARY_LINE_RE = re.compile(
    # lemma may contain [vowel] alternation markers, {t/s} alt-suffix markers,
    # diacritics, or hyphens before the suffix tag
    r"^(?P<lemma_raw>[a-zëçáéíóúàèìòùâêîôûäöü\[\]{}/]+)"
    r"-(?P<suffix>j|0)\s+"
    r"(?P<pattern>(?:[IV]+(?:-[IV]+)*(?:-\d+[a-z]?)?))\s+"
    r"\(like\s+(?P<model>[a-zëçA-ZËÇ]+)\)"
    r"(?:\s+(?P<gloss>.+))?\s*$",
    re.IGNORECASE,
)


def normalize_lemma(raw: str, suffix: str) -> str:
    """Strip Husić's alternation markers ([o], {t/s}, etc.) to get the citation
    form. Strategy: pick the FIRST alternative inside any brackets/braces."""
    # [vowel] markers — keep the bracketed letter(s)
    s = re.sub(r"\[([^\]]+)\]", r"\1", raw)
    # {alt1/alt2} markers — keep the first alternative
    s = re.sub(r"\{([^/}]+)/[^}]+\}", r"\1", s)
    # Append the suffix (j or empty for class 2)
    if suffix == "j":
        return s + "j"
    return s


def parse_glossary_section(full_text: str) -> list[dict]:
    """Parse the 'Index to Verbs by Conjugation Pattern' section.

    The section heading appears twice in the PDF: once in the table of
    contents (page 0/1) and once as the actual section heading. We skip
    the first occurrence and parse from the second.

    Returns a list of dicts: {lemma, lemma_id, suffix, pattern, model, gloss}.
    """
    lines = full_text.split("\n")
    # Find all occurrences of the heading; the section start is at the
    # second one (the first is in the TOC).
    occurrences = [i for i, line in enumerate(lines) if "Index to Verbs by Conjugation Pattern" in line]
    if len(occurrences) < 2:
        return []
    start_idx = occurrences[1] + 1
    # Section ends at the next major heading after start
    end_idx = len(lines)
    for i in range(start_idx, len(lines)):
        if (
            "Albanian-English Verb Glossary" in lines[i]
            or "English-Albanian Verb Glossary" in lines[i]
            or "Index to Verbs by Conjugation Type" in lines[i]
            or "Verb Paradigms Index" in lines[i]
        ):
            end_idx = i
            break

    entries: list[dict] = []
    for i in range(start_idx, end_idx):
        line = lines[i].strip()
        if not line or is_page_artifact(line):
            continue
        m = GLOSSARY_LINE_RE.match(line)
        if not m:
            continue
        lemma = normalize_lemma(m.group("lemma_raw"), m.group("suffix"))
        entries.append({
            "lemma": lemma,
            "lemma_id": ascii_id(lemma),
            "suffix": m.group("suffix"),
            "pattern": m.group("pattern"),
            "model": m.group("model").lower(),
            "gloss": (m.group("gloss") or "").strip(),
        })
    return entries


def emit_jsonl(entries: list[dict], only_verb: str | None) -> int:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    written = 0
    for entry in entries:
        if only_verb and entry["id"] != only_verb:
            continue
        path = CACHE_DIR / f"{entry['id']}.jsonl"
        with open(path, "w", encoding="utf-8") as f:
            for record in entry["forms"]:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
        written += 1
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Parse Husić PDF into per-verb JSONL.")
    parser.add_argument("pdf_path", help="Path to husic.pdf")
    parser.add_argument("--only-verb", help="Only emit cache for this verb id")
    parser.add_argument("--list", action="store_true", help="List parsed verbs without writing")
    parser.add_argument("--limit", type=int, help="Process only the first N verbs (debugging)")
    parser.add_argument(
        "--emit-glossary-map",
        help="Emit alphabetical-glossary entries as a JSON map to this path "
             "(used by the TypeScript cross-resolver).",
    )
    args = parser.parse_args()

    if not os.path.exists(args.pdf_path):
        print(f"✗ source path does not exist: {args.pdf_path}", file=sys.stderr)
        return 1

    print(f"▶ Extracting text from {args.pdf_path}...")
    pages = extract_text_pages(args.pdf_path)
    full_text = "\n".join(pages)
    print(f"  pages={len(pages)}, total_chars={len(full_text)}")

    print("▶ Parsing verb sections...")
    entries = list(parse_full_text(full_text))
    if args.limit:
        entries = entries[: args.limit]
    print(f"  found {len(entries)} verb sections")

    if args.emit_glossary_map:
        glossary = parse_glossary_section(full_text)
        with open(args.emit_glossary_map, "w", encoding="utf-8") as f:
            json.dump(glossary, f, ensure_ascii=False, indent=2)
        print(f"  glossary entries: {len(glossary)} → {args.emit_glossary_map}")

    if args.list:
        for e in entries:
            print(f"  {e['id'].ljust(20)} {e['lemma'].ljust(20)} '{e['gloss']}' [{len(e['forms'])} forms]")
        return 0

    written = emit_jsonl(entries, args.only_verb)
    print(f"✓ Wrote {written} cache files to {CACHE_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
