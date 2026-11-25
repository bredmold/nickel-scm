#!/usr/bin/env bash

set -euo pipefail

function publish_tables {
  echo OK
}

CMD="$1"

case "$CMD" in
table)
  npm -w packages/table run build
  npm -w packages/table run test

  cp .npmrc packages/table/dist
  cd packages/table/dist
  npm stage publish
  ;;

**)
  echo "Unknown command $CMD"
  exit 1
  ;;
esac
