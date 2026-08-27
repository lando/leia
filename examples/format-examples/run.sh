#!/usr/bin/env bash

set -euo pipefail

module_format="${1:-auto}"
root="$(cd "$(dirname "$0")" && pwd)"
leia="$root/../../bin/leia"

for scenario in commonjs esm untyped nested/commonjs; do
  expected=cjs
  opposite=mjs
  if [[ "$module_format" == esm || "$module_format:$scenario" == auto:esm ]]; then
    expected=mjs
    opposite=cjs
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
    harnesses="$(find .tmp -type f -name "*.leia.$expected" -print)"
    harness_count="$(printf '%s\n' "$harnesses" | sed '/^$/d' | wc -l | tr -d ' ')"
    if [[ "$harness_count" != 1 ]]; then
      echo "Expected one .$expected harness for $scenario, found $harness_count"
      printf '%s\n' "$harnesses"
      exit 1
    fi
    harness="$harnesses"

    if find .tmp -type f -name "*.leia.$opposite" -print | grep -q .; then
      echo "Leia generated an unexpected .$opposite harness for $scenario"
      exit 1
    fi

    if [[ "$expected" == mjs ]]; then
      grep -Fq "import {createRequire} from 'node:module';" "$harness"
      grep -Fq 'const require = createRequire(import.meta.url);' "$harness"
    else
      grep -Fq "const chai = require('" "$harness"
      if grep -Fq 'createRequire(import.meta.url)' "$harness"; then
        echo "CommonJS harness contains the ESM dependency loader"
        exit 1
      fi
    fi

    if find .tmp -type f -name package.json -print | grep -q .; then
      echo "Leia generated an unexpected package boundary"
      exit 1
    fi
    test ! -e leia-state.txt
  )
done
