#!/usr/bin/env python3
"""Fill UniParser analyzer request JSONL rows with local analyzer output."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def tags(value: Any) -> list[str]:
    if not isinstance(value, str):
        return []
    return sorted({part.strip() for part in value.replace(";", ",").split(",") if part.strip()})


def analysis_json(analysis: Any) -> dict[str, Any]:
    gramm = getattr(analysis, "gramm", "")
    return {
        "wf": getattr(analysis, "wf", None),
        "lemma": getattr(analysis, "lemma", None),
        "gramm": gramm,
        "tags": tags(gramm),
    }


def load_rows(path: Path) -> list[dict[str, Any]]:
    required = {
        "targetId",
        "targetKey",
        "signature",
        "targetGeneratedAt",
        "corpusVersion",
        "coverageTargetGeneratedAt",
        "mode",
        "token",
    }
    rows: list[dict[str, Any]] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        row = json.loads(line)
        if not isinstance(row, dict):
            raise ValueError(f"{path}:{line_number}: expected JSON object")
        missing = sorted(key for key in required if not isinstance(row.get(key), str) or not row[key])
        if missing:
            raise ValueError(f"{path}:{line_number}: missing {', '.join(missing)}")
        if row.get("mode") not in {"strict", "no_diacritics"}:
            raise ValueError(f"{path}:{line_number}: unknown mode {row.get('mode')!r}")
        rows.append(row)
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--requests", default=".cache/uniparser-analysis-requests.jsonl")
    parser.add_argument("--out", default=".cache/uniparser-analysis.jsonl")
    args = parser.parse_args()

    request_path = Path(args.requests)
    try:
        rows = load_rows(request_path)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    try:
        from uniparser_albanian import AlbanianAnalyzer
    except ModuleNotFoundError:
        print(
            "Missing Python package: uniparser-albanian. Install it locally with "
            "`pip3 install uniparser-albanian`.",
            file=sys.stderr,
        )
        return 2

    analyzers = {
        "strict": AlbanianAnalyzer(mode="strict"),
        "no_diacritics": AlbanianAnalyzer(mode="nodiacritics"),
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cache: dict[tuple[str, str], list[dict[str, Any]]] = {}
    rows_with_analyses = 0
    analysis_count = 0
    with out_path.open("w", encoding="utf-8") as out:
        for row in rows:
            key = (row["mode"], row["token"])
            if key not in cache:
                analyses = analyzers[row["mode"]].analyze_words(row["token"])
                cache[key] = [analysis_json(analysis) for analysis in analyses]
            row["analyses"] = cache[key]
            if row["analyses"]:
                rows_with_analyses += 1
                analysis_count += len(row["analyses"])
            out.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")

    print(
        f"Wrote {len(rows)} row(s), {len(cache)} unique token/mode lookup(s), "
        f"{rows_with_analyses} row(s) with analyses, {analysis_count} analysis record(s) to {out_path}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
