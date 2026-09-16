# Lifecycle Failure

## Setup

```bash
# should record setup before the test
printf '%s\n' setup > "$LEIA_LIFECYCLE_TRACE"
```

## Testing

```bash
# should fail after setup
printf '%s\n' test >> "$LEIA_LIFECYCLE_TRACE"
exit 17
```

## Cleanup

```bash
# should run cleanup after the failed test
printf '%s\n' cleanup >> "$LEIA_LIFECYCLE_TRACE"
```
