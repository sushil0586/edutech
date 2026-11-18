#!/usr/bin/env python3
"""Execute a command with values loaded from a dotenv-style environment file."""

import os
import sys
from pathlib import Path


def load_environment(path: Path) -> dict[str, str]:
    environment = os.environ.copy()
    for line_number, raw_line in enumerate(path.read_text().splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise ValueError(f"Invalid environment entry at {path}:{line_number}")
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key or not key.replace("_", "").isalnum() or key[0].isdigit():
            raise ValueError(f"Invalid environment key at {path}:{line_number}")
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        environment[key] = value
    return environment


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit("Usage: run-with-env.py ENV_FILE COMMAND [ARG ...]")
    env_path = Path(sys.argv[1])
    if not env_path.is_file():
        raise SystemExit(f"Environment file not found: {env_path}")
    os.execvpe(sys.argv[2], sys.argv[2:], load_environment(env_path))


if __name__ == "__main__":
    main()
