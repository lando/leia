#!/usr/bin/env bash

set -euo pipefail

module_format="${1:-auto}"
root="$(cd "$(dirname "$0")" && pwd)"
leia="$root/../../bin/leia"

for scenario in commonjs esm untyped nested/commonjs; do
  expected=cjs
  if [[ "$module_format" == esm || "$module_format:$scenario" == auto:esm ]]; then
    expected=mjs
  fi

  (
    cd "$root/$scenario"
    mkdir -p .tmp
    export TEMP="$PWD/.tmp"
    export TMP="$PWD/.tmp"
    export TMPDIR="$PWD/.tmp"

    args=(README.md --retry 2 --stdin --timeout 5)
    if [[ "$module_format" != auto ]]; then
      args+=(--module-format "$module_format")
    fi

    node "$leia" "${args[@]}"
    find .tmp -type f -name "*.leia.$expected" -print | grep .
    if find .tmp -type f -name package.json -print | grep -q .; then
      echo "Leia generated an unexpected package boundary"
      exit 1
    fi
    test ! -e leia-state.txt
  )
done
