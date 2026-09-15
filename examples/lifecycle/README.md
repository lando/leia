# Execution lifecycle

## Test

```sh
# Should preserve lifecycle behavior through source and built entrypoints
node verify.cjs
```

The probe runs the same scenario through Bun source and the built Node CLI, in both harness
formats. Its scratch state is isolated and removed after each run. Catchable POSIX signals are
checked on macOS and Linux; Windows uses recursive process termination for timeouts.
