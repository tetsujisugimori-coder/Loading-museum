# Boundary validation artifact preservation contract

This contract applies to newly built Boundary validation artifacts only. It does
not backfill old ZIPs or promote primary FAIL, INCOMPLETE or NOT_TESTED. Overall
PARTIAL, production108 NO, merge NO and Draft remain unchanged.

## Saved sets and meanings

The existing builder copies every tracked file to its isolated directory. The
saved input set therefore equals the fixed HEAD's full Git tree file set (not a
hand-picked hash list). Documentation copied by that builder is retained too,
which costs more space but avoids changing its build inputs. Untracked inputs,
symlinks and uncommitted source-byte changes are rejected. All input body captures
happen before Next is invoked, and saved inputs, original checkout and isolated
staged sources are compared again after the build.

`boundary-build/preservation/` contains:

Saved source-body filenames append `.bin`; the input ledger maps them to original
paths. Bytes remain unchanged. This keeps archived TS/TSX/JavaScript bodies out of
Next/TypeScript source discovery without changing the product tsconfig or build
expectations. The exported output filenames remain unchanged.

- `git-source/`: actual fixed Git blob bodies, separately identified by Git
  SHA1(`blob <byte-length> NUL <bytes>`), SHA256 and byte length.
- `execution-source/`: the exact raw checkout bodies copied for this build.
  RAW_IDENTICAL and verified LF_TO_CRLF_ONLY correspondence are separate values;
  cross-OS raw equality is not inferred from Git correspondence.
- `transformed-source/`: the two actual Swipe/Status TSX bodies after the existing
  A/B/C instrumentation (and an explicitly declared existing fault transform, if
  used by another authorized workflow). The other staged files reference their
  unchanged saved execution bodies; they are not stored a third time.
- `inputs.json`: exact paths, HEAD/tree/blob, sizes, hashes, raw/Git relation and
  staged-body mappings. The independent auditor recomputes the declared transform.
- `outputs.json`: exact exported `out/` file set, sizes and SHA256, bound to the
  input manifest. The full `out/` is uploaded, including `.nojekyll`. Expected
  output entries are never removed to match an incomplete artifact.

`boundary-build.json` binds these manifests and retains the existing source,
transformed, preparation-code and output hash tables. `originalSourcePreserved`
is set only after saved bodies and actual staged/source bytes are checked.
`build.log` and the separate preservation-audit result are uploaded too.

Installed node_modules package bodies are **not** uploaded. package.json and the
lockfile bodies, Node/platform identifiers and the existing full installed-file
dependency SHA256 table identify that part of the environment. The builder checks
that its installed dependency bytes stayed unchanged, recording
`dependencyWorkspaceUnchanged=true`; `dependencyBytesPreserved=false` accurately
states that the artifact does not preserve those package bodies. Reinstallation
availability and byte-for-byte compiler-package reproduction remain limits.
Next's `.next` compiler intermediates and host binary bodies are not retained;
all final browser export outputs are retained. This is not an independent
recompilation, proof of HTTP execution, or instrumentation neutrality proof.

## Inspection and regression

```text
node scripts/phase7d-boundary-preservation.mjs audit FIXED_GIT_REPO HEAD TREE EXTRACTED_BOUNDARY_BUILD
node --test tests/phase7d-boundary-preservation.test.mjs
```

The first command reads saved bodies and fixed Git objects; it does not require
the original workspace or node_modules, and launches no browser. A separate
process can run it against a new extraction of an unchanged original artifact.
It rejects missing source bodies with hashes still present, missing `.nojekyll`,
changed bytes, extra source/output files, and foreign HEAD/tree/transform data.

Synthetic fixture tests label themselves NO_BUILD/NO_BROWSER. The same complete
fixture is passed through the old hidden-excluding upload equivalent (RED) and a
hidden-inclusive ZIP/CRC/extraction path (GREEN). The old raw boundary auditor
already rejected missing output bytes when given that incomplete directory; the
old defect was the uploaded file set and lack of source-body preservation, not a
claim that this old output checker accepted a missing `.nojekyll`.

The Boundary workflow includes the new independent saved-body audit with
`if: always()` and `include-hidden-files: true`. Its existing browser operations,
conditions, timeouts, primary results, raw audit and failure handling are unchanged.
Only automatic CI following the normal PR update is used in this task. Until the
new original artifact ZIPs are downloaded and independently inspected, CI artifact
omission resolution remains PENDING, regardless of local tests or upload success.
