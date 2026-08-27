# ESM Module Format

## Setup

```sh
# should prepare an ESM package scenario
node -e "require('node:fs').writeFileSync('leia-state.txt', 'ready')"
node -e "require('node:fs').mkdirSync('.tmp', {recursive: true})"
```

## Testing

```sh
# should demonstrate why a legacy CommonJS .js harness fails in an ESM package
if node legacy-harness.js > .tmp/legacy-error.log 2>&1; then exit 1; fi
grep "require is not defined" .tmp/legacy-error.log

# should execute the generated harness from an ESM package
node -e "if (require('node:fs').readFileSync('leia-state.txt', 'utf8') !== 'ready') process.exit(1)"
```

## Cleanup

```sh
# should remove the ESM package scenario state
node -e "require('node:fs').unlinkSync('leia-state.txt')"
node -e "require('node:fs').rmSync('.tmp/legacy-error.log', {force: true})"
```
