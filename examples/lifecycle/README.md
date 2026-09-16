# Execution lifecycle

## Test

```sh
# should preserve lifecycle behavior through all selected execution targets
node verify.cjs
```

The probe runs the same scenario through Bun source, built Node ESM, and built Node CommonJS,
in both harness formats. `LEIA_RUNTIME=source|esm|cjs` selects one target for an isolated CI job;
without it, the probe checks all three targets. Its scratch state is isolated and removed after each run.
Catchable POSIX signals and real PTYs are checked on macOS and Linux; Windows uses recursive process
termination for timeouts and reports the POSIX exclusions explicitly.
