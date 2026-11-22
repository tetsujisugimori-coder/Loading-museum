"""Run one isolated Stage C worker session for diagnostics."""

import argparse
import hashlib
import json
import sys
from pathlib import Path

# Isolated Python mode omits the script directory from sys.path.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from process_supervisor import run_supervised


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("rootfs", "driver", "package", "binding"):
        parser.add_argument(name, type=lambda value: Path(value).resolve(strict=True))
    parser.add_argument("binding_sha256")
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    binding = args.binding.read_bytes()
    if hashlib.sha256(binding).hexdigest() != args.binding_sha256:
        parser.error("approved diagnostic binding hash mismatch")
    manifest = json.loads(binding)
    repo = Path(__file__).resolve().parents[2]
    runtime = manifest["runtimeFiles"]["repo"]
    worker_dir = "diagnostic-isolated/c-s1-10"
    for filename in ("stage_c_diagnostic.py", "stage-c-worker-diagnostic.mjs", "stage-c-worker-inputs.mjs",
                     "stage-c-worker.mjs", "browser-runtime.mjs", "process_supervisor.py"):
        if f"{worker_dir}/{filename}" not in runtime:
            parser.error("diagnostic binding lacks " + filename)
    for name, expected in runtime.items():
        path = (repo / name).resolve(strict=True)
        if not path.is_relative_to(repo) or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            parser.error("diagnostic runtime hash mismatch: " + name)

    raw = args.destination.with_name(args.destination.name + "-evidence")
    raw.mkdir(mode=0o700)
    receipt = run_supervised(
        args.rootfs, ["/usr/bin/node", f"/mnt/{worker_dir}/stage-c-worker-diagnostic.mjs",
                      "/tmp/diagnostic-binding.json", args.binding_sha256, "/media/outputs",
                      "/srv/entry.js", "/var/tmp/evidence"],
        args.destination, readonly=[(repo, "/mnt"), (args.driver, "/srv"), (args.package, "/media"),
                                    (args.binding, "/tmp/diagnostic-binding.json")],
        writable=[(raw, "/var/tmp")], private_network=True,
        soft_seconds=75, hard_seconds=105,
        network_notice=raw / "evidence" / "network-stop.notice.json",
    )
    return 0 if (receipt["stopCompleted"] and receipt["workerExit"] == 0 and
                 receipt["networkMismatchDetected"] is None) else 1


if __name__ == "__main__":
    raise SystemExit(main())
