# Execution source body contract (new executions only)

Starting HEAD90e91adfae8475525d842cd0828e90b2417521c5/tree92c627478dff18698ff16c6ec0b28f1a2cb78917 adds only the final-CI review to4aeaa46. Old17success/3failure remains attached to4aeaa46, not this starting or later HEAD.

## Fixed target set and timing
The fixed policy includes every tracked file under app/,public/,scripts/,tests/,.github/workflows/ plus root .gitattributes/package.json/package-lock.json/eslint.config.mjs/next.config.ts/tsconfig.json. Historical docs are not execution inputs in this scoped workflow. Untracked/extra/missing files within these execution roots are rejected. Package-lock identifies dependency versions; installed dependency-package bodies, OS libraries and Node executable are not claimed as fully captured by this source policy. Browser executables and isolated build inputs/outputs are separately recorded by the browser plan.

Capture runs immediately before standardcheck/safety tests in the safety workflow. A separate process audits saved bodies and current checkout after execution, including failed runs, before upload. The exact commands are preserved in the captured workflow and CI log. Isolated Next builds receive an additional pre-build capture; browser prepare captures again before trial launch. Transformed copies/builds/HTTP responses have independent evidence and are not conflated with raw Git source.

## Independent bindings
For every target: relative path,Git mode/blob SHA,Git actual bytes/size/SHA256,actual checkout bytes/size/rawSHA256 are saved. Git object hash is SHA1 over `blob <length>\0` plus bytes, not a SHA256 file hash. The independent audit reads actual saved files, Git objects and checkout; it does not trust declared checksums or an incomplete chosen file list.

RAW_IDENTICAL and LF_TO_CRLF_ONLY are distinct. Exact raw comparison may FAIL while a specific whole-file LF→CRLF correspondence is proven. Any other modification is rejected. No normalized equality is reported as raw-byte equality.

## Negative and normal controls
Normal rawLF and normalCRLF preserve true bytes. Missing bodies with the same otherwise-valid manifest, raw edits, Gitbody edits, coordinated rawbytes+size+SHA changes, changed execution source, extra/missing targets, scope/HEAD/blob mismatch and overwrite are rejected. The original missing-body counterexample and corrected capture are recorded separately. An initial test that failed merely on invalid schema was rejected by independent review and replaced with a valid-manifest/missing-body counterexample; its old log is retained, not counted as meaningful missing-body RED.

No old artifact is rewritten or retroactively made complete. Old CI source-body absence remains NOT_OBTAINED. Source/readback success does not establish product PASS, source-to-build reproducibility, React scheduling neutrality or native crash resilience. Those remain separately scoped judgments.

## Submission and protection
Dedicated new work/evidence/temp only. Initial cloud free space22GiB /3,609,836free inodes. No sharedtemp or old evidence removal. Production108 always disabled, Draft retained, mergeNO. CLI push authentication failure is preserved; reviewed tree may be submitted through the authorized GitHub Git-data connection with exact expected parent and nonforce fast-forward, followed by HEAD/tree readback. No arbitrary retry, timeout extension, product expectation change or WebKit exclusion.
