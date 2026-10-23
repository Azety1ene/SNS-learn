#!/bin/bash
# Claude Code のクラウド環境でセッションが始まったときに、テストやビルドがすぐ動く状態にする
set -euo pipefail

# クラウド環境（Claude Code on the web）でだけ実行する
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# 依存パッケージを入れる（すでに入っていれば一瞬で終わる）
pnpm install

# 開発・テスト用の PostgreSQL を起動する（sns_dev / sns_test / sns_e2e）
bash scripts/local-db.sh

# E2E テストでは、環境にあらかじめ入っている Chromium を使う
if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -x /opt/pw-browsers/chromium ]; then
  echo 'export PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
fi
