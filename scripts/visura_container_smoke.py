"""A bounded real-container smoke pilot for the future VISURA supervisor.

Only runs an internal, trusted probe. Never runs PR/issue-supplied code,
accepts arbitrary container commands, uses secrets, or authorizes execution.
Docker is invoked by a trusted outer process, *not* inside the container.
This pilot does not independently attest the Docker host or user namespace.
"""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import uuid

IMAGE_TAG = "python:3.12.16-alpine3.24"
IMAGE_ID_RE = re.compile(r"sha256:[a-f0-9]{64}\Z")
CONTAINER_NAME_PREFIX = "visura-container-smoke-"
CONTAINER_NAME_RE = re.compile(r"visura-container-smoke-[a-f0-9]{32}\Z")
TIMEOUT_SECONDS = 45
PROBE = r'''
import json
import os
from pathlib import Path
import socket

def cannot_write(target):
    try:
        target.write_text("visura-smoke", encoding="utf-8")
    except OSError:
        return True
    return False

def cannot_reach_external_ip():
    try:
        with socket.create_connection(("198.51.100.1", 443), timeout=1):
            return False
    except OSError:
        return True

report = {
    "unprivileged_uid": os.geteuid() == 65534,
    "workspace_read_only": cannot_write(Path("/sandbox/forbidden.txt")),
    "root_filesystem_read_only": cannot_write(Path("/etc/visura-smoke-forbidden")),
    "external_network_unreachable": cannot_reach_external_ip(),
    "host_docker_socket_not_mounted": not Path("/var/run/docker.sock").exists(),
    "host_secrets_absent": not any(
        key in os.environ for key in (
            "GITHUB_TOKEN", "GH_TOKEN", "OPENROUTER_API_KEY",
            "SUPABASE_SERVICE_ROLE_KEY", "ACTIONS_ID_TOKEN_REQUEST_TOKEN"
        )
    ),
}
print(json.dumps(report, sort_keys=True))
if not all(report.values()):
    raise SystemExit(2)
'''


def docker_args(image_id, workspace, name):
    """Build a fixed command without shell or user-controlled code."""
    if not isinstance(image_id, str) or not IMAGE_ID_RE.fullmatch(image_id):
        raise ValueError("Image must be a locally inspected immutable image ID")
    workspace = Path(workspace)
    if (not workspace.is_absolute() or not workspace.is_dir()
            or workspace.is_symlink()):
        raise ValueError("Workspace must be an existing non-symlink absolute directory")
    if not isinstance(name, str) or not CONTAINER_NAME_RE.fullmatch(name):
        raise ValueError("Invalid ephemeral container name")
    return [
        "docker", "run", "--rm", "--pull=never", "--name", name,
        "--network=none", "--read-only", "--cap-drop=ALL",
        "--security-opt=no-new-privileges:true",
        "--pids-limit=32", "--memory=128m", "--memory-swap=128m",
        "--cpus=0.5", "--user=65534:65534",
        "--tmpfs=/tmp:rw,nosuid,nodev,noexec,size=16777216,mode=1777",
        "--mount=type=bind,source=" + str(workspace) + ",target=/sandbox,readonly",
        "--workdir=/sandbox", "--env=PYTHONDONTWRITEBYTECODE=1",
        "--env=HOME=/nonexistent", image_id,
        "python3", "-I", "-B", "/sandbox/probe.py",
    ]


def _run(argv, timeout=TIMEOUT_SECONDS):
    environment = {
        "PATH": os.defpath, "HOME": "/nonexistent", "LANG": "C",
        "LC_ALL": "C", "DOCKER_CONFIG": "/nonexistent",
    }
    return subprocess.run(
        argv, env=environment, shell=False, capture_output=True,
        text=True, timeout=timeout, check=False,
    )


def cleanup_container(name):
    """Remove a test container and independently verify whether it remains."""
    if not isinstance(name, str) or not CONTAINER_NAME_RE.fullmatch(name):
        raise ValueError("Invalid ephemeral container name")
    try:
        _run(["docker", "rm", "-f", name], timeout=10)
    except Exception:
        pass
    try:
        remaining = _run(
            ["docker", "container", "ls", "--all", "--format={{.Names}}"],
            timeout=10,
        )
    except Exception:
        return "unverifiable"
    if remaining.returncode != 0 or not isinstance(remaining.stdout, str):
        return "unverifiable"
    names = remaining.stdout.splitlines()
    matches = [container_name for container_name in names
               if container_name in (name, "/" + name)]
    if not matches:
        return "confirmed"
    if len(matches) == 1:
        return "failed"
    return "unverifiable"


def run_smoke_pilot():
    """Pull a fixed tag, pin the observed image ID, and run trusted probe."""
    if shutil.which("docker") is None:
        raise RuntimeError("Docker unavailable; isolation unverified, fail closed")
    pulled = _run(["docker", "pull", "--quiet", IMAGE_TAG])
    if pulled.returncode:
        raise RuntimeError("Fixed test image unavailable: " + pulled.stderr[-500:])
    inspected = _run(["docker", "image", "inspect", "--format={{.Id}}", IMAGE_TAG])
    image_id = inspected.stdout.strip()
    if inspected.returncode or not IMAGE_ID_RE.fullmatch(image_id):
        raise RuntimeError("Cannot obtain immutable image ID, fail closed")
    with tempfile.TemporaryDirectory(prefix="visura-sandbox-smoke-") as directory:
        workspace = Path(directory)
        (workspace / "probe.py").write_text(PROBE, encoding="utf-8")
        (workspace / "probe.py").chmod(0o644)
        workspace.chmod(0o755)  # Only trusted, credential-free fixture is present.
        name = CONTAINER_NAME_PREFIX + uuid.uuid4().hex
        cmd = docker_args(image_id, workspace, name)
        try:
            completed = _run(cmd, timeout=TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired as exc:
            # A timed-out Docker CLI need not terminate the child container.
            cleanup_status = cleanup_container(name)
            raise RuntimeError(
                "Smoke timeout; container cleanup " + cleanup_status
            ) from exc
        except (subprocess.SubprocessError, OSError) as exc:
            cleanup_status = cleanup_container(name)
            raise RuntimeError(
                "Smoke launch failed; container cleanup " + cleanup_status
            ) from exc
        if completed.returncode:
            cleanup_status = cleanup_container(name)
            raise RuntimeError(
                "Container smoke failed; container cleanup " + cleanup_status
                + ": " + completed.stderr[-700:] + completed.stdout[-700:]
            )
        try:
            report = json.loads(completed.stdout.strip())
        except json.JSONDecodeError as exc:
            raise RuntimeError("Missing trustworthy probe output") from exc
        if (not isinstance(report, dict) or len(report) != 6
                or any(value is not True for value in report.values())):
            raise RuntimeError("Required sandbox smoke observation missing")
        return {
            "mode": "trusted_fixture_container_smoke",
            "image_id": image_id,
            "observations": report,
            "network_disabled_for_probe": True,
            "outside_repo_writes": False,
            "human_identity_verified": False,
            "host_isolation_independently_attested": False,
            "untrusted_code_execution_authorized": False,
            "github_write_authorized": False,
            "merge_authorized": False,
            "deployment_authorized": False,
            "model_calls": 0,
        }


def main(argv=None):
    parser = argparse.ArgumentParser(description="Trusted container pilot only")
    parser.add_argument("--pilot", action="store_true", required=True)
    parser.parse_args(argv)
    print(json.dumps(run_smoke_pilot(), sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
