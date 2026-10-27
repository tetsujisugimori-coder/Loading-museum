# PR専用品質CIの設計

2026-10-27。既存Pages公開workflowは変更・起動しない。新規 `pr-quality.yml` だけを追加する。

- `pull_request` と `workflow_dispatch`。Draft PRも除外しない。`pull_request_target`、push/main、公開、デプロイ、Issue/PRへの自動書込みを含まない。権限は `contents: read` のみ。checkoutの資格情報保持は無効。
- `ubuntu-24.04`、Node `24.22.1`、npm `11.9.0` を固定し、`npm ci` でlockfile依存を導入。Node配布物には別npm版が同梱されるため、npmのpinを独立したセットアップ処理とする。package/lockfileは変更しない。runtimeの実値を検証する。
- PRではhead SHAを明示checkout。GitHubイベントのSHA（PRではsynthetic merge commit）と実checkout HEAD/treeを別々に保存し、期待headとの一致を強制する。**merge後の統合結果を検証するworkflowではない**。
- `npm run check` は現契約のlint→typecheck→npm test（build→Nodeテスト→Vitest）をそのまま実行。`npm run build` を独立stepでも行う。check失敗後も依存導入・identityが成功しcancelされていなければbuildを観測するが、先の失敗はjob失敗のまま。`continue-on-error`、retry、skip、test timeout上書きは使用しない。
- job上限30分はCI全体の資源安全弁であり、各テストの既存5000msを変更しない。上限到達やrunner喪失では終了メタデータ・artifactが残らない可能性があり、取得不能を成功にしない。
- 標準出力/標準エラーをファイルとActionsログの双方へ保存し、終了コードをそのまま伝搬する小さなPython recorderをworkflow内に保持。開始/終了はUTC、経過時間は `perf_counter_ns()`。recorder自体のエラーも非0。実行コマンド・異常終了・signalを記録する。
- `always()` の後処理でstep outcomeと各ファイルSHA-256を記録し、固定名の必要ログとprovenanceだけを別のupload stagingへコピーしてartifactへ14日保存。manifestとupload pathの双方を固定filenameリストに限定し、未想定ファイルやsymlinkはコピーしない。artifact名にrun/attempt/headを含める。環境変数全体、認証情報、GitHub context全体、ホームディレクトリ、製品build出力、巨大CPU profileを収集しない。成果物はrunner一時領域に置きsource treeへ混入させない。
- Node/npm、lockfile SHA、runner image、namespaceから見えるavailableParallelism、CI flagを保存する。ホスト全体の負荷や全ブラウザCPUの測定ではない。GitHub CIとlocalは同じNode/npmでもOS・CPU割当・CI flag等が異なり、完全同条件とは称さない。
- CIの一回成功はローカル既定3回＋worker1 2回の安定性検証の代替ではない。最終HEADの実runとartifactを取得して初めて実行成否を報告する。workflow作成だけを成功証拠にしない。

## 第一希望・次善策

第一希望は独立read-only PR品質workflowで、既存check契約を再利用し失敗を伝搬する方式。本設計で採用した。Pages workflowの流用は公開権限とデプロイ経路を伴うため不採用。大量raw診断や製品build一式の無条件アップロードも採用しない。

新workflowがdefault branchにまだ無い間は手動実行UI/APIに制約があり得る。初回はPR更新の `synchronize` によるrunを確認する。手動実行不能でもmainへ直接追加・マージして解決せず、その制約を報告する。

## 公式一次資料と固定バージョン確認

2026-10-27に公式資料およびGit refsを確認した。

- [GitHub workflowイベント](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows): PRのevent SHAとhead SHA、手動実行の条件。
- [Node公式リリース索引](https://nodejs.org/download/release/index.json)、[Actions Node配布manifest](https://raw.githubusercontent.com/actions/node-versions/main/versions-manifest.json): Node24.22.1/linux-x64存在を確認。公式Node配布のnpmは11.19.1でありlocal11.9.0と異なる。
- [checkout](https://github.com/actions/checkout)、[setup-node](https://github.com/actions/setup-node)、[upload-artifact](https://github.com/actions/upload-artifact): 当日のv7 refを実取得し、workflowでは可動tagでなくcommit SHAへ固定。各action.ymlのruntimeはNode24。artifact SHA-256はGitHub API digest/実ZIPと、内部manifestのファイルhashを区別して提出担当が照合する。

実CIの結果・run URL・最終HEAD・独立レビューは後続記録に記す。本設計文書自体は実CI成功を主張しない。

## 設定段階の軽量検査

workflow YAML構造と3つのPython heredocの構文を検査した。workflowから抽出した同じcommand recorderを一時領域で実行し、正常exit0、意図した失敗exit7、存在しないcommandのexit1をそれぞれ保持すること、stdout/stderrの両方をlogへ保存することを確認した。これはrecorderの負例対照であり、製品検査やGitHub runnerでの実行の代替ではない。

repo rootからの再現コマンド（外部依存・製品build不要）:

```sh
python3 - <<'PY'
import pathlib, tempfile, subprocess, json, sys
lines = pathlib.Path('.github/workflows/pr-quality.yml').read_text().splitlines()
i = next(i for i, line in enumerate(lines) if 'cat >' in line and 'run-command.py' in line)
body = []
for line in lines[i + 1:]:
    if line.strip() == 'PY':
        break
    body.append(line[10:])
with tempfile.TemporaryDirectory(prefix='loading-ci-control-') as directory:
    root = pathlib.Path(directory)
    script = root / 'recorder.py'
    script.write_text('\n'.join(body))
    cases = [
        ('ok', [sys.executable, '-c', 'print("stdout");import sys;print("stderr",file=sys.stderr)'], 0),
        ('failure', [sys.executable, '-c', 'raise SystemExit(7)'], 7),
        ('missing', ['/no-such-quality-command'], 1),
    ]
    for name, command, expected in cases:
        run = subprocess.run([sys.executable, str(script), str(root), name, *command], capture_output=True)
        result = json.loads((root / (name + '.json')).read_text())
        assert run.returncode == expected and result['exit_code'] == expected
        assert result['elapsed_seconds'] >= 0
        print(name, 'exit', run.returncode, 'PASS')
    assert 'stdout' in (root / 'ok.log').read_text() and 'stderr' in (root / 'ok.log').read_text()
    print('merged stdout/stderr preservation PASS')
PY
```

2026-10-27 00:19 UTC出力:

```text
ok exit 0 PASS
failure exit 7 PASS
missing exit 1 PASS
merged stdout/stderr preservation PASS
```

最終outcomesではcheckout後のHEAD/treeとtracked changesも照合し、検査中のsource変更を成功にしない。artifact保存処理はsource不一致のassertで失敗しても後続 `always()` で実行する。

## 独立レビューへの対応（設定段階）

- P2: 初稿はevidenceディレクトリ全体をupload/manifest列挙していたため、想定外の追加ファイルも含み得た。固定11名（recorder、4コマンド各log/json、provenance、outcomes）だけを別upload stagingへコピーし、manifest自身を含む固定12名だけをuploadする方式へ修正した。symlinkも除外する。
- P3: 初稿の最終treeは記録だけで明示比較していなかった。初期provenanceのtreeと最終treeの一致を検査し、`source_unchanged` をoutcomesに保存した。identity未取得はnullで、成功を推測しない。

最終後処理の軽量負例再現（temporary Git fixtureだけを作成、製品テストではない）:

```sh
python3 - <<'PY'
import pathlib, tempfile, subprocess, json, os
lines = pathlib.Path('.github/workflows/pr-quality.yml').read_text().splitlines()
blocks = []
for i, line in enumerate(lines):
    if "<<'PY'" not in line:
        continue
    body = []
    for line in lines[i + 1:]:
        if line.strip() == 'PY':
            break
        body.append(line[10:])
    blocks.append('\n'.join(body))
with tempfile.TemporaryDirectory(prefix='quality-final-control-') as directory:
    path = pathlib.Path(directory)
    root, upload = path / 'evidence', path / 'upload'
    root.mkdir()
    script = path / 'final.py'
    script.write_text(blocks[-1])
    (root / 'check.log').write_text('required-log')
    (root / 'secret-extra.txt').write_text('not-for-upload')
    (root / 'build.log').symlink_to(root / 'secret-extra.txt')
    env = {**os.environ, 'QUALITY_EVIDENCE': str(root), 'QUALITY_UPLOAD': str(upload),
           'RUN_ID': 'control', 'RUN_ATTEMPT': '1', 'EXPECTED_HEAD': 'fake', 'EVENT_SHA': 'fake',
           'GITHUB_OUTPUT': str(path / 'github-output')}
    upload.mkdir()
    (upload / 'build.log').write_text('stale-log')
    (upload / 'check.log').symlink_to(root / 'secret-extra.txt')
    run = subprocess.run(['python3', str(script)], env=env, cwd=path, capture_output=True)
    assert run.returncode == 0
    assert not (upload / 'secret-extra.txt').exists() and not (upload / 'build.log').exists()
    assert (upload / 'check.log').read_text() == 'required-log'
    assert json.loads((upload / 'outcomes.json').read_text())['source_unchanged'] is None
    print('allowlist extra-file/symlink exclusion and unavailable identity PASS')
    repo = path / 'repo'
    subprocess.run(['git', 'init', '-q', str(repo)], check=True)
    (repo / 'f').write_text('fixture')
    subprocess.run(['git', 'add', 'f'], cwd=repo, check=True)
    subprocess.run(['git', '-c', 'user.name=Control', '-c', 'user.email=control@example.invalid',
                    'commit', '-qm', 'fixture'], cwd=repo, check=True)
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
    tree = subprocess.check_output(['git', 'rev-parse', 'HEAD^{tree}'], cwd=repo, text=True).strip()
    env['EXPECTED_HEAD'] = head
    for name, stored, expected in [('matching', tree, 0), ('mismatch', '0' * 40, 1)]:
        (root / 'provenance.json').write_text(json.dumps({'checked_tree': stored}))
        run = subprocess.run(['python3', str(script)], env=env, cwd=repo, capture_output=True)
        assert run.returncode == expected
        assert json.loads((upload / 'outcomes.json').read_text())['source_unchanged'] == (expected == 0)
        assert (upload / 'sha256.json').exists()
        print(name, 'tree exit', run.returncode, 'PASS')
PY
```

2026-10-27 00:22 UTC出力:

```text
allowlist extra-file/symlink exclusion and unavailable identity PASS
matching tree exit 0 PASS
mismatch tree exit 1 PASS
```

再レビューで指摘されたupload stagingの残存・symlinkも対処した。専用stagingはsymlinkならリンクだけ除去し、既存directoryなら内容を破棄して空から作る。固定ファイルコピーとmanifest作成が完了したときだけ `upload_ready` を出し、artifactはこの出力を必要条件にする。後処理初期失敗で未検証の旧stagingを送信しない。source不一致はready後のassertで失敗し、その診断は送信できる。上記負例には事前stagingの残存build.logとcheck.logのsymlinkも追加した。
