#!/usr/bin/env python3
"""Create and verify non-secret release provenance for promoted source archives."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SHA1_RE = re.compile(r"^[0-9a-f]{40}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
ALLOWED_ENVIRONMENTS = {"staging", "production"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_manifest(manifest: dict) -> None:
    if manifest.get("schema_version") != 1:
        raise ValueError("Unsupported release manifest schema_version.")
    if not SHA1_RE.fullmatch(str(manifest.get("git_sha", ""))):
        raise ValueError("git_sha must be a full 40-character hexadecimal commit SHA.")
    if not SHA1_RE.fullmatch(str(manifest.get("git_tree", ""))):
        raise ValueError("git_tree must be a full 40-character hexadecimal tree SHA.")
    if not SHA256_RE.fullmatch(str(manifest.get("source_archive_sha256", ""))):
        raise ValueError("source_archive_sha256 must be a 64-character SHA-256 digest.")
    if manifest.get("environment") not in ALLOWED_ENVIRONMENTS:
        raise ValueError("environment must be staging or production.")
    timestamp = str(manifest.get("build_timestamp", ""))
    try:
        parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("build_timestamp must be an ISO-8601 timestamp.") from exc
    if parsed.tzinfo is None:
        raise ValueError("build_timestamp must include a timezone.")
    lockfiles = manifest.get("component_lockfiles")
    if not isinstance(lockfiles, dict):
        raise ValueError("component_lockfiles must be an object.")
    for digest in lockfiles.values():
        if not SHA256_RE.fullmatch(str(digest)):
            raise ValueError("Every component lockfile digest must be SHA-256.")


def build_manifest(
    *,
    git_sha: str,
    git_tree: str,
    archive: Path,
    environment: str,
    build_timestamp: str,
    lockfiles: list[Path],
) -> dict:
    manifest = {
        "schema_version": 1,
        "release_id": f"{environment}-{git_sha[:12]}",
        "git_sha": git_sha.lower(),
        "git_tree": git_tree.lower(),
        "build_timestamp": build_timestamp,
        "environment": environment,
        "packaging": {
            "type": "git-archive",
            "container_image_digest": None,
        },
        "source_archive_sha256": sha256_file(archive),
        "component_lockfiles": {
            path.as_posix(): sha256_file(path) for path in sorted(lockfiles)
        },
    }
    validate_manifest(manifest)
    return manifest


def load_manifest(path: Path) -> dict:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    validate_manifest(manifest)
    return manifest


def verify_release(
    manifest: dict,
    archive: Path,
    *,
    expected_sha: str | None = None,
    expected_environment: str | None = None,
) -> None:
    actual_digest = sha256_file(archive)
    if actual_digest != manifest["source_archive_sha256"]:
        raise ValueError("Source archive digest does not match release manifest.")
    if expected_sha and manifest["git_sha"] != expected_sha.lower():
        raise ValueError("Release manifest Git SHA does not match the requested candidate.")
    if expected_environment and manifest["environment"] != expected_environment:
        raise ValueError("Release manifest environment does not match the deployment target.")


def write_build_environment(manifest: dict, output: Path) -> None:
    values = {
        "APP_BUILD": manifest["git_sha"],
        "APP_BUILD_TIMESTAMP": manifest["build_timestamp"],
        "APP_ENVIRONMENT": manifest["environment"],
        "APP_ARTIFACT_SHA256": manifest["source_archive_sha256"],
    }
    output.write_text(
        "".join(f"{key}={value}\n" for key, value in values.items()),
        encoding="utf-8",
    )


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    create = subparsers.add_parser("create")
    create.add_argument("--git-sha", required=True)
    create.add_argument("--git-tree", required=True)
    create.add_argument("--archive", type=Path, required=True)
    create.add_argument("--environment", choices=sorted(ALLOWED_ENVIRONMENTS), required=True)
    create.add_argument("--build-timestamp", default=utc_now())
    create.add_argument("--lockfile", action="append", type=Path, default=[])
    create.add_argument("--output", type=Path, required=True)

    verify = subparsers.add_parser("verify")
    verify.add_argument("--manifest", type=Path, required=True)
    verify.add_argument("--archive", type=Path, required=True)
    verify.add_argument("--expected-sha")
    verify.add_argument("--expected-environment", choices=sorted(ALLOWED_ENVIRONMENTS))

    env_file = subparsers.add_parser("env")
    env_file.add_argument("--manifest", type=Path, required=True)
    env_file.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.command == "create":
        manifest = build_manifest(
            git_sha=args.git_sha,
            git_tree=args.git_tree,
            archive=args.archive,
            environment=args.environment,
            build_timestamp=args.build_timestamp,
            lockfiles=args.lockfile,
        )
        args.output.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        return

    manifest = load_manifest(args.manifest)
    if args.command == "verify":
        verify_release(
            manifest,
            args.archive,
            expected_sha=args.expected_sha,
            expected_environment=args.expected_environment,
        )
        return

    write_build_environment(manifest, args.output)


if __name__ == "__main__":
    main()
