# Nested CommonJS Module Format

## Setup

```sh
# should prepare a nearest-package scenario
node -e "require('node:fs').writeFileSync('leia-state.txt', 'ready')"
```

## Testing

```sh
# should execute the generated harness from the nearest CommonJS package
node -e "if (require('node:fs').readFileSync('leia-state.txt', 'utf8') !== 'ready') process.exit(1)"
```

## Cleanup

```sh
# should remove the nearest-package scenario state
node -e "require('node:fs').unlinkSync('leia-state.txt')"
```
