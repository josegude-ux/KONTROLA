"""Security tests for the trusted, fixed-image VISURA container pilot."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import subprocess

from scripts import visura_container_smoke as m

IMAGE_ID = "sha256:" + "a" * 64
NAME = "visura-container-smoke-" + "b" * 32


class DockerCommandTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.workspace = Path(self.temp.name)

    def test_required_restrictions_present(self):
        args = m.docker_args(IMAGE_ID, self.workspace, NAME)
        for expected in (
            "--rm", "--pull=never", "--network=none", "--read-only",
            "--cap-drop=ALL", "--security-opt=no-new-privileges:true",
            "--pids-limit=32", "--memory=128m", "--memory-swap=128m",
            "--cpus=0.5", "--user=65534:65534",
            "--env=PYTHONDONTWRITEBYTECODE=1",
            "--env=HOME=/nonexistent",
        ):
            self.assertIn(expected, args)
        self.assertIn("readonly", next(x for x in args if x.startswith("--mount=")))
        self.assertEqual(args[-4:], ["python3", "-I", "-B", "/sandbox/probe.py"])
        self.assertNotIn("--privileged", args)
        self.assertNotIn("--network=host", args)
        self.assertNotIn("/var/run/docker.sock", " ".join(args))
        self.assertNotIn("--env-file", args)

    def test_only_immutable_image_id_allowed(self):
        for image in ("python:latest", "python:3.12-alpine", "",
                      "sha256:bad", IMAGE_ID + " extra"):
            with self.subTest(image=image), self.assertRaises(ValueError):
                m.docker_args(image, self.workspace, NAME)

    def test_no_symlink_workspace_allowed(self):
        link = self.workspace / "link"
        link.symlink_to(self.workspace)
        with self.assertRaises(ValueError):
            m.docker_args(IMAGE_ID, link, NAME)

    def test_no_missing_workspace(self):
        with self.assertRaises(ValueError):
            m.docker_args(IMAGE_ID, self.workspace / "missing", NAME)

    def test_fixed_ephemeral_container_name(self):
        with self.assertRaises(ValueError):
            m.docker_args(IMAGE_ID, self.workspace, "production")

    def test_cleanup_rejects_non_ephemeral_names(self):
        with patch.object(m, "_run") as mocked_run:
            with self.assertRaises(ValueError):
                m.cleanup_container("production; echo unsafe")
        mocked_run.assert_not_called()


class SmokePolicyTests(unittest.TestCase):
    def test_probe_does_not_authorize_untrusted_code(self):
        self.assertIn("external_network_unreachable", m.PROBE)
        self.assertIn("host_docker_socket_not_mounted", m.PROBE)
        self.assertIn("host_secrets_absent", m.PROBE)
        self.assertNotIn("eval(", m.PROBE)
        self.assertNotIn("exec(", m.PROBE)

    @patch.object(m.shutil, "which", return_value=None)
    def test_missing_docker_fails_closed(self, _which):
        with self.assertRaisesRegex(RuntimeError, "unavailable"):
            m.run_smoke_pilot()

    @patch.object(m.shutil, "which", return_value="/usr/bin/docker")
    @patch.object(m, "_run")
    def test_image_pull_failure_blocks_run(self, mocked_run, _which):
        mocked_run.return_value = subprocess.CompletedProcess(
            ["docker", "pull"], 1, stdout="", stderr="not reachable"
        )
        with self.assertRaisesRegex(RuntimeError, "unavailable"):
            m.run_smoke_pilot()
        self.assertEqual(mocked_run.call_count, 1)

    @patch.object(m.shutil, "which", return_value="/usr/bin/docker")
    @patch.object(m, "_run")
    def test_malformed_inspected_image_blocks_run(self, mocked_run, _which):
        mocked_run.side_effect = [
            subprocess.CompletedProcess(["docker", "pull"], 0, stdout="", stderr=""),
            subprocess.CompletedProcess(["docker", "inspect"], 0, stdout="mutable:tag\n", stderr=""),
        ]
        with self.assertRaisesRegex(RuntimeError, "immutable"):
            m.run_smoke_pilot()
        self.assertEqual(mocked_run.call_count, 2)

    @patch.object(m.shutil, "which", return_value="/usr/bin/docker")
    @patch.object(m, "_run")
    def test_probe_cannot_claim_success_when_unverified(self, mocked_run, _which):
        mocked_run.side_effect = [
            subprocess.CompletedProcess([], 0, stdout="", stderr=""),
            subprocess.CompletedProcess([], 0, stdout=IMAGE_ID + "\n", stderr=""),
            subprocess.CompletedProcess([], 0, stdout='{"host_secrets_absent": true}', stderr=""),
        ]
        with self.assertRaisesRegex(RuntimeError, "observation"):
            m.run_smoke_pilot()

    @patch.object(m.shutil, "which", return_value="/usr/bin/docker")
    @patch.object(m, "_run")
    def test_timeout_cleanup_confirmed_by_absence_check(self, mocked_run, _which):
        mocked_run.side_effect = [
            subprocess.CompletedProcess([], 0, stdout="", stderr=""),
            subprocess.CompletedProcess([], 0, stdout=IMAGE_ID + "\n", stderr=""),
            subprocess.TimeoutExpired("docker run", m.TIMEOUT_SECONDS),
            subprocess.CompletedProcess([], 1, stdout="", stderr="already removed"),
            subprocess.CompletedProcess([], 0, stdout="", stderr=""),
        ]
        with patch.object(m.uuid, "uuid4") as mocked_uuid:
            mocked_uuid.return_value.hex = "b" * 32
            with self.assertRaisesRegex(
                RuntimeError, "timeout; container cleanup confirmed"
            ):
                m.run_smoke_pilot()
        self.assertEqual(mocked_run.call_count, 5)
        cleanup_args = mocked_run.call_args_list[3].args[0]
        verify_args = mocked_run.call_args_list[4].args[0]
        self.assertEqual(cleanup_args[:3], ["docker", "rm", "-f"])
        self.assertRegex(cleanup_args[3], r"^visura-container-smoke-[a-f0-9]{32}$")
        self.assertEqual(verify_args[:3], ["docker", "container", "ls"])
        self.assertEqual(verify_args[3:], ["--all", "--format={{.Names}}"])
        self.assertNotIn("--filter", verify_args)

    @patch.object(m.shutil, "which", return_value="/usr/bin/docker")
    @patch.object(m, "_run")
    def test_timeout_cleanup_failed_or_unverifiable(self, mocked_run, _which):
        cases = (
            (
                subprocess.CompletedProcess([], 0, stdout="/" + NAME + "\n", stderr=""),
                "failed",
            ),
            (
                subprocess.CompletedProcess([], 1, stdout="", stderr="daemon unavailable"),
                "unverifiable",
            ),
            (subprocess.TimeoutExpired("docker container ls", 10), "unverifiable"),
        )
        for verification, expected_status in cases:
            with self.subTest(expected_status=expected_status):
                mocked_run.reset_mock()
                mocked_run.side_effect = [
                    subprocess.CompletedProcess([], 0, stdout="", stderr=""),
                    subprocess.CompletedProcess([], 0, stdout=IMAGE_ID + "\n", stderr=""),
                    subprocess.TimeoutExpired("docker run", m.TIMEOUT_SECONDS),
                    subprocess.CompletedProcess([], 0, stdout="", stderr=""),
                    verification,
                ]
                with patch.object(m.uuid, "uuid4") as mocked_uuid:
                    mocked_uuid.return_value.hex = "b" * 32
                    with self.assertRaisesRegex(
                        RuntimeError, "timeout; container cleanup " + expected_status
                    ):
                        m.run_smoke_pilot()

    @patch.object(m.shutil, "which", return_value="/usr/bin/docker")
    @patch.object(m, "_run")
    def test_nonzero_run_attempts_and_verifies_cleanup(self, mocked_run, _which):
        mocked_run.side_effect = [
            subprocess.CompletedProcess([], 0, stdout="", stderr=""),
            subprocess.CompletedProcess([], 0, stdout=IMAGE_ID + "\n", stderr=""),
            subprocess.CompletedProcess([], 2, stdout="probe output", stderr="run error"),
            subprocess.CompletedProcess([], 0, stdout="", stderr=""),
            subprocess.CompletedProcess([], 0, stdout="", stderr=""),
        ]
        with patch.object(m.uuid, "uuid4") as mocked_uuid:
            mocked_uuid.return_value.hex = "b" * 32
            with self.assertRaisesRegex(
                RuntimeError, "Container smoke failed; container cleanup confirmed"
            ) as raised:
                m.run_smoke_pilot()
        self.assertIn("run error", str(raised.exception))
        self.assertEqual(mocked_run.call_count, 5)


if __name__ == "__main__":
    unittest.main()
