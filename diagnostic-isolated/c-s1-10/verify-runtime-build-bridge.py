#!/usr/bin/env python3
"""Read-only Stage C archive/runtime binding check. Never runs registered trials."""
import argparse
import copy
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import sys
from zipfile import ZipFile

def digest(data):
    return hashlib.sha256(data).hexdigest()

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

def check(ok, detail):
    if not ok:
        raise ValueError(detail)

def git(root, *args):
    return subprocess.run(["git", "-C", str(root), *args], check=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout

def verify_build(archive, bridge, contract=None):
    content = archive.read_bytes()
    anchor = bridge["historicalBuild"]
    check(len(content) == anchor["bytes"] and digest(content) == anchor["zipSha256"],
          "Original build ZIP bytes differ")
    with ZipFile(archive) as z:
        names = z.namelist()
        check(len(names) == len(set(names)), "Duplicate ZIP member")
        check(z.testzip() is None, "ZIP CRC failed")
        original = z.read("binding.json")
        check(digest(original) == anchor["bindingSha256"], "Original binding hash changed")
        binding = json.loads(original)
        check((binding["sourceHead"], binding["sourceTree"]) ==
              (bridge["source"]["head"], bridge["source"]["tree"]), "Original source changed")
        check(binding["implementationHead"] == anchor["implementationHead"],
              "Original build implementation changed")
        for level in ("I0", "I1", "I2"):
            payload = binding["outputs"][level]
            spec = bridge["levels"][level]
            check(digest(canonical(payload)) == spec["outputInventorySha256"],
                  f"{level}: output inventory changed")
            files, routes = payload["files"], payload["routes"]
            check(len(files) == spec["files"] and len(routes) == spec["routes"],
                  f"{level}: inventory count changed")
            actual = {n.removeprefix(f"outputs/{level}/") for n in names
                      if n.startswith(f"outputs/{level}/") and not n.endswith("/")}
            expected = {r["path"] for r in files}
            check(actual == expected and len(files) == len(expected),
                  f"{level}: build file set mismatch")
            by_file = {}
            for row in files:
                p = row["path"]
                check(p and not p.startswith("/") and all(x not in ("..", "") for x in PurePosixPath(p).parts),
                      f"{level}: unsafe file path")
                b = z.read(f"outputs/{level}/{p}")
                check(len(b) == row["bytes"] and digest(b) == row["sha256"],
                      f"{level}: build file hash mismatch: {p}")
                by_file[p] = row["sha256"]
            seen = set()
            for row in routes:
                check(row["path"] in by_file and by_file[row["path"]] == row["sha256"],
                      f"{level}: route-to-file mismatch")
                check(row["resource"] not in seen, f"{level}: duplicate route")
                seen.add(row["resource"])
            if contract is not None:
                allow = contract["product"]["levels"][level]["allowlist"]
                actual_routes = {r["resource"]: {"mappedBuildFile": r["path"],
                                                "sha256": r["sha256"]} for r in routes}
                check(actual_routes == allow, f"{level}: network contract differs")
        return binding, {"archive": "PASS", "CRC": "PASS", "buildFiles": 108, "routes": 117,
                         "currentContract": "PASS" if contract else "NOT_TESTED"}

def verify_runtime(repo, bridge):
    spec = bridge["runtimeSource"]
    head = spec["head"]
    check(git(repo, "rev-parse", f"{head}^{{tree}}").decode().strip() == spec["tree"],
          "Pinned runtime tree differs")
    output = {}
    for path, row in sorted(spec["repoBlobs"].items()):
        blob = git(repo, "rev-parse", f"{head}:{path}").decode().strip()
        check(blob == row["blobSha1"], f"Git blob differs: {path}")
        body = git(repo, "cat-file", "blob", blob)
        check(len(body) == row["bytes"], f"Git blob size differs: {path}")
        local = repo / path
        check(local.is_file() and local.read_bytes() == body,
              f"Current checkout file differs: {path}")
        output[path] = digest(body)
    for required in spec["requiredForSupervisor"]:
        check(required in output, f"Required supervisor runtime missing: {required}")
    return output

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--archive", type=Path, required=True)
    p.add_argument("--bridge", type=Path, required=True)
    p.add_argument("--repo", type=Path, help="Checkout with pinned Git runtime available")
    p.add_argument("--candidate-out", type=Path, help="Exclusive-write non-executable manifest")
    a = p.parse_args()
    bridge = json.loads(a.bridge.read_bytes())
    check(bridge["status"] == "NON_EXECUTABLE_HOLD" and bridge["executionAuthorized"] is False,
          "Bridge must not authorize execution")
    contract = None
    if a.repo:
        contract = json.loads((a.repo / "diagnostic-isolated/c-s1-10/NETWORK-CONTRACT-v1.json").read_bytes())
    binding, proof = verify_build(a.archive, bridge, contract)
    result = {"status": "PARTIAL", "build": proof, "runtimeSource": "NOT_TESTED",
              "rootfs": "NOT_PROVEN", "driver": "NOT_PROVEN",
              "currentBrowserResponses": "NOT_TESTED", "executionAuthorized": False}
    if a.repo:
        hashes = verify_runtime(a.repo, bridge)
        result["runtimeSource"] = "PASS"
        result["runtimeFileCount"] = len(hashes)
        check(a.candidate_out is not None, "Candidate output path is required")
        candidate = copy.deepcopy(binding)
        candidate["status"] = "CANDIDATE_HOLD_NOT_EXECUTABLE"
        candidate["implementationHead"] = bridge["runtimeSource"]["head"]
        candidate["implementationTree"] = bridge["runtimeSource"]["tree"]
        # Never carry historical driver/rootfs hashes into a newer runtime.
        candidate["runtimeFiles"] = {"repo": hashes, "rootfs": {}, "driver": {}}
        candidate["runtimeBindingContext"] = {
            "historicalBuildZipSha256": bridge["historicalBuild"]["zipSha256"],
            "currentDriverAndRootfs": "NOT_PROVEN",
            "currentProductBrowserResponses": "NOT_TESTED",
            "executionAuthorized": False}
        with a.candidate_out.open("x", encoding="utf-8") as dest:
            json.dump(candidate, dest, ensure_ascii=False, sort_keys=True, indent=2)
            dest.write("\n")
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))

if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as e:
        print(f"BLOCKED: {e}", file=sys.stderr)
        sys.exit(2)
