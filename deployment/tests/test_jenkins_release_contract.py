import unittest
from pathlib import Path


class JenkinsReleaseContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pipeline = (Path(__file__).resolve().parents[2] / "Jenkinsfile").read_text(
            encoding="utf-8"
        )

    def test_deployment_requires_exact_approved_main_containing_candidate(self):
        self.assertIn("choices: ['ci', 'full']", self.pipeline)
        self.assertIn("RELEASE_GIT_SHA", self.pipeline)
        self.assertIn("DEPLOY_APPROVAL_REFERENCE", self.pipeline)
        self.assertIn('git merge-base --is-ancestor origin/main "$RELEASE_GIT_SHA"', self.pipeline)
        self.assertIn('git checkout --detach "$RELEASE_GIT_SHA"', self.pipeline)

    def test_deployment_promotes_and_verifies_one_source_archive(self):
        self.assertIn('git archive --format=tar "$RELEASE_SHA"', self.pipeline)
        self.assertIn("deployment edutech_backend edutech_web nexora_student_mobile", self.pipeline)
        self.assertIn("for component in deployment edutech_backend edutech_web nexora_student_mobile", self.pipeline)
        self.assertIn("release_manifest.py create", self.pipeline)
        self.assertGreaterEqual(self.pipeline.count("release_manifest.py\" verify"), 1)
        self.assertNotIn('./ "ubuntu@${DEPLOY_HOST}:${DEPLOY_PATH}/"', self.pipeline)

    def test_deployment_uses_strict_ssh_and_runtime_attestation(self):
        self.assertNotIn("StrictHostKeyChecking=no", self.pipeline)
        self.assertIn("StrictHostKeyChecking=yes", self.pipeline)
        self.assertIn("verify-https-entrypoint.sh", self.pipeline)
        self.assertIn("test:e2e:staging-release-security", self.pipeline)
        self.assertIn("Expo Quality and Release Policy", self.pipeline)
        self.assertIn("npm run validate:release-config", self.pipeline)


if __name__ == "__main__":
    unittest.main()
