# Compatibility Baseline

This executable scenario records only Leia's observable Markdown workflow so the same expectations
can follow the compiler and runner through the 2.0 rewrite.

## Setup

```bash
# Should initialize lifecycle state before tests
printf '%s\n' setup > "$LEIA_BASELINE_TRACE"
```

## Testing

```bash
# Should run the scenario command after setup
test "$(cat "$LEIA_BASELINE_TRACE")" = setup
printf '%s\n' "command $(printf '%s' substitution)" > "$LEIA_BASELINE_RESULT"
printf '%s\n' test >> "$LEIA_BASELINE_TRACE"
exit "${LEIA_BASELINE_COMMAND_STATUS:-0}"
```

## Cleanup

```bash
# Should record cleanup after tests
printf '%s\n' cleanup >> "$LEIA_BASELINE_TRACE"
```
