#!/usr/bin/env bash

set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/leia-compatibility.XXXXXX")"
trap 'rm -rf "$temp_dir"' EXIT

if [[ "$#" -eq 0 ]]; then
  leia_command=(node "$root/../../bin/leia")
else
  leia_command=("$@")
fi

show_failure() {
  local message="$1"
  local output="$2"

  echo "$message"
  cat "$output"
  exit 1
}

assert_effects() {
  local trace="$1"
  local result="$2"
  local output="$3"
  local expected_trace

  expected_trace=$'setup\ntest\ncleanup'
  if [[ ! -f "$trace" ]]; then
    show_failure "Compatibility run did not create its lifecycle trace." "$output"
  fi
  if [[ "$(cat "$trace")" != "$expected_trace" ]]; then
    show_failure "Compatibility run did not preserve setup, test, cleanup order." "$output"
  fi
  if [[ ! -f "$result" ]]; then
    show_failure "Compatibility run did not create its command result." "$output"
  fi
  if [[ "$(cat "$result")" != "command substitution" ]]; then
    show_failure "Compatibility run did not preserve command side effects." "$output"
  fi
}

run_case() {
  local module_format="$1"
  local command_status="$2"
  local expected_result="$3"
  local case_id="$module_format-$expected_result"
  local output="$temp_dir/$case_id.output"
  local status

  export LEIA_BASELINE_TRACE="$temp_dir/$case_id.trace"
  export LEIA_BASELINE_RESULT="$temp_dir/$case_id.result"
  export LEIA_BASELINE_COMMAND_STATUS="$command_status"
  export TEMP="$temp_dir"
  export TMP="$temp_dir"
  export TMPDIR="$temp_dir"

  if "${leia_command[@]}" "$root/README.md" --module-format "$module_format" --retry 0 --shell bash >"$output" 2>&1; then
    status=0
  else
    status=$?
  fi

  if [[ "$expected_result" == success && "$status" -ne 0 ]]; then
    show_failure "Compatibility run unexpectedly failed for $module_format." "$output"
  fi
  if [[ "$expected_result" == failure && "$status" -eq 0 ]]; then
    show_failure "Compatibility run unexpectedly succeeded for $module_format." "$output"
  fi

  assert_effects "$LEIA_BASELINE_TRACE" "$LEIA_BASELINE_RESULT" "$output"
}

for module_format in commonjs esm; do
  run_case "$module_format" 0 success
  run_case "$module_format" 17 failure
done
