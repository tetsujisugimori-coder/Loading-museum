# Independent source replay: scroll / geometry experiment

This compact package reproduces the independent review's exact deterministic inputs against an immutable old comparator and a selectable current comparator. It contains synthetic fault-injection fixtures, **not browser-run or physical-device evidence**.

## Run from repository root

After placing this directory at `docs/phase6a5/standard-touch/scroll-geometry/independent-review`:

```sh
node docs/phase6a5/standard-touch/scroll-geometry/independent-review/replay.mjs \
  --current diagnostics/scroll-geometry/contract.mjs
```

Optional `--baseline PATH` selects a different old comparator; the default is the adjacent immutable `contract-before.mjs`. Optional `--out PATH` writes compact JSON results. Both imports are local and configurable. The command exits nonzero if expected rejections or positive controls regress. It does not modify the application or generate browser evidence.

## Reviewed source identity

- Original comparator: local commit `bb19915`, SHA-256 `1328e517157ec40c3f6c91d09d0c3e62d787d1aff91376ec8b05d4b44795aba6`. The included snapshot's bytes were checked against that commit.
- Fixed comparator: SHA-256 `717d7d3afa033887497e02218eebfc8f2e70da6f813e6679456673e72b98067f`.
- Local reviewed commit `69da9121ad03d80e5c35111ff156f9dcb1fe60a0` and published PR #78 commit `66f99c0a273e4c51dfaf94e34359e454e7dd3950` have tree `d770d45738b487b1ede1ba7853d9ffc3377de326`.
- Fixture-set SHA-256 `927891b86bec2280ea7bd3b6b1953705ff460365a9d001a1d023a3e7cb724576` uses recursively sorted object keys while retaining array order.

## Results and interpretation

27 cases were run with identical inputs through both comparators, with no unexpected results:

- 11 original fixtures are unchanged. The old comparator establishes all 11; the fixed comparator does not. The original positive/cancellation fixtures intentionally remain untouched and lack the newly required observer field, so these two rejections are **not** additional bugs fixed.
- 16 protocol-complete fixtures avoid that missing-metadata confound. Nine fault cases change from old acceptance to rejection/non-executable construction, one invalid-value case remains rejected, and six controls remain accepted.
- Five of those six controls cover normal completion and cancellation. The sixth confirms the returned diagnosis remains `cause: UNKNOWN` even when a raw input record makes an unsupported causal claim.
- Cancellation controls include pointer cancel followed by touchend, cancellation of both families, and a cancelled pointer with an unfinished touch family. All remain `CANCELLED`.
- Negative scroll remains a relative scroll difference but cannot satisfy the absolute B target. This demonstrates that relative condition classification and successful protocol construction remain distinct.
- Existing repository contract tests passed 39/39 at the reviewed source. See `contract-tests.log`.

The fixes reject reversed or mismatched lifecycle endpoints, missing capture/input identity, wrong command paths, unfinished parallel lifecycles, responses predating input commands, pointer-type changes, backward event snapshots, and incorrect protocol geometry/scroll targets. Geometry and scroll remain separately evaluated; final values do not establish equivalent conditions.

The total 20 acceptance-to-rejection transitions in `replay-result.json` include the 11 original incomplete fixtures and the nine complete fault cases. Do not interpret that total as 20 independent product bugs.

## Fixture preservation

`fixtures.mjs` replaces duplicated raw JSON with deterministic constructors. Before packaging, every generated `{name,a,b}` was compared with the preserved original raw JSON using Node `assert.deepStrictEqual` after JSON normalization. All 27 input pairs matched exactly. `fixture-provenance.json` records the original raw-file hashes; the large raw files remain outside this package. Both comparator results are recomputed during replay.

## Evidence still required

This review is source-level only. Formal final-HEAD CI, unique full-matrix coverage, original artifact digests, JSON/image/trace bytes, and browser-observed statistics require a separate audit. Successful source replay does not establish gesture success, causal attribution, or physical iPhone Safari acceptance. Physical input remains `NOT_TESTED`; cause remains `UNKNOWN`.
