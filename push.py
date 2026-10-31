#!/usr/bin/env python3
"""push.py — Stage, commit and push all changes in the FrenchWeb repo.

Usage:
    python3 push.py                          # default message with timestamp
    python3 push.py "My custom commit msg"   # custom message
"""
from __future__ import annotations

import subprocess
import sys
from datetime import datetime
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent


def run(*args: str, cwd: Path = REPO_DIR) -> str:
    """Run a git command and return stripped stdout (raises on failure)."""
    return subprocess.run(
        ["git", *args], cwd=cwd, check=True, capture_output=True, text=True
    ).stdout.strip()


def main() -> int:
    msg = sys.argv[1] if len(sys.argv) > 1 else f"Auto-update {datetime.now():%Y-%m-%d %H:%M}"

    # 1. Stage everything (respecting .gitignore)
    run("add", "-A")

    # 2. Commit only if there is something staged
    if run("diff", "--cached", "--quiet") == "":
        print("Nothing to commit — working tree clean.")
        return 0

    run("commit", "-m", msg)

    # 3. Push to the active branch's upstream
    branch = run("rev-parse", "--abbrev-ref", "HEAD")
    run("push", "origin", branch)

    print(f"Done: pushed '{msg}' to {branch}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())