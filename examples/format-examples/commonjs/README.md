# CommonJS Module Format

## Setup

```sh
# should prepare a CommonJS package scenario
node -e "require('node:fs').writeFileSync('leia-state.txt', 'ready')"
```

## Testing

```sh
# should execute the generated harness from a CommonJS package
node -e "if (require('node:fs').readFileSync('leia-state.txt', 'utf8') !== 'ready') process.exit(1)"
```

## Cleanup

```sh
# should remove the CommonJS package scenario state
node -e "require('node:fs').unlinkSync('leia-state.txt')"
```
