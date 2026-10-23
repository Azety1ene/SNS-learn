#!/usr/bin/env bash
# Claude の作業環境（クラウドのコンテナ）で、開発・テスト用の PostgreSQL を起動する。
# 本番では Neon を使うので、このスクリプトはローカル専用。
set -euo pipefail

PG_BIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"
PGDATA="${PGDATA:-/tmp/sns-learn-pgdata}"
PGPORT="${PGPORT:-5432}"

# PostgreSQL は root では動かせないので postgres ユーザーで実行する
as_pg() { su postgres -s /bin/bash -c "$*"; }

if [ ! -d "$PGDATA" ]; then
  mkdir -p "$PGDATA" && chown postgres:postgres "$PGDATA"
  # ローカル専用なのでパスワードなし（trust）で接続できるようにする
  as_pg "$PG_BIN/initdb -D $PGDATA -U postgres --auth=trust --encoding=UTF8 --locale=C.UTF-8 >/dev/null"
fi

if ! as_pg "$PG_BIN/pg_ctl -D $PGDATA status" >/dev/null 2>&1; then
  as_pg "$PG_BIN/pg_ctl -D $PGDATA -l $PGDATA/server.log -o '-p $PGPORT -k /tmp' start -w >/dev/null"
fi

for db in sns_dev sns_test sns_e2e; do
  if ! psql -h 127.0.0.1 -p "$PGPORT" -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1; then
    psql -h 127.0.0.1 -p "$PGPORT" -U postgres -c "CREATE DATABASE $db" >/dev/null
  fi
done

echo "PostgreSQL is running on 127.0.0.1:$PGPORT (databases: sns_dev, sns_test, sns_e2e)"
