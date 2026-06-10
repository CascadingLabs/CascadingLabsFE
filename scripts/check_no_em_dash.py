#!/usr/bin/env python3
"""Fail when prose files contain em dashes."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

PROSE_SUFFIXES = {".adoc", ".md", ".mdx", ".rst", ".txt", ".yaml", ".yml"}
SKIP_DIRS = {".git", ".mypy_cache", ".pytest_cache", ".ruff_cache", "node_modules", "public"}


def tracked_files() -> list[Path]:
    try:
        result = subprocess.run(
            ["git", "ls-files", "-z"],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return []

    return [Path(name) for name in result.stdout.decode().split("\0") if name]


def iter_paths(args: list[str]) -> list[Path]:
    if args:
        candidates = [Path(arg) for arg in args]
        expand_dirs = True
    else:
        candidates = tracked_files()
        expand_dirs = False
        if not candidates:
            candidates = [Path(".")]
            expand_dirs = True

    paths: list[Path] = []
    for candidate in candidates:
        if expand_dirs and candidate.is_dir():
            paths.extend(path for path in candidate.rglob("*") if path.is_file())
        elif candidate.is_file():
            paths.append(candidate)
    return paths


def is_prose_file(path: Path) -> bool:
    if path.suffix.lower() not in PROSE_SUFFIXES:
        return False
    return not any(part in SKIP_DIRS for part in path.parts)


def main() -> int:
    failures: list[str] = []

    for path in iter_paths(sys.argv[1:]):
        if not is_prose_file(path):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for line_number, line in enumerate(text.splitlines(), start=1):
            if "—" in line:
                failures.append(f"{path}:{line_number}: contains em dash")

    if failures:
        print("Em dashes are not allowed in prose files; use plain punctuation instead.")
        print("\n".join(failures))
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
