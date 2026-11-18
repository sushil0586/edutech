import json
import tempfile
import unittest
from pathlib import Path

from deployment.release_manifest import (
    build_manifest,
    load_manifest,
    verify_release,
    write_build_environment,
)


class ReleaseManifestTests(unittest.TestCase):
    def setUp(self):
        self.temp_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_directory.name)
        self.archive = self.root / "source.tar.gz"
        self.archive.write_bytes(b"deterministic-release-archive")
        self.lockfile = self.root / "package-lock.json"
        self.lockfile.write_text('{"lockfileVersion": 3}\n', encoding="utf-8")

    def tearDown(self):
        self.temp_directory.cleanup()

    def make_manifest(self) -> dict:
        return build_manifest(
            git_sha="a" * 40,
            git_tree="b" * 40,
            archive=self.archive,
            environment="staging",
            build_timestamp="2026-10-15T09:30:00Z",
            lockfiles=[self.lockfile],
        )

    def test_manifest_round_trip_and_build_environment(self):
        manifest = self.make_manifest()
        manifest_path = self.root / "release-manifest.json"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

        loaded = load_manifest(manifest_path)
        verify_release(
            loaded,
            self.archive,
            expected_sha="a" * 40,
            expected_environment="staging",
        )
        env_path = self.root / ".env.build"
        write_build_environment(loaded, env_path)

        values = dict(
            line.split("=", 1)
            for line in env_path.read_text(encoding="utf-8").splitlines()
        )
        self.assertEqual(values["APP_BUILD"], "a" * 40)
        self.assertEqual(values["APP_ENVIRONMENT"], "staging")
        self.assertEqual(values["APP_ARTIFACT_SHA256"], manifest["source_archive_sha256"])

    def test_verification_rejects_archive_tampering(self):
        manifest = self.make_manifest()
        self.archive.write_bytes(b"tampered")

        with self.assertRaisesRegex(ValueError, "digest"):
            verify_release(manifest, self.archive)

    def test_validation_rejects_short_git_sha(self):
        with self.assertRaisesRegex(ValueError, "40-character"):
            build_manifest(
                git_sha="abc123",
                git_tree="b" * 40,
                archive=self.archive,
                environment="staging",
                build_timestamp="2026-10-15T09:30:00Z",
                lockfiles=[],
            )


if __name__ == "__main__":
    unittest.main()
