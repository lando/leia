# ESM Module Format

## Setup

```sh
# Should prepare an ESM scenario
node -e "require('fs').writeFileSync('leia-state.txt', 'ready')"
```

## Testing

```sh
# Should run from an ESM package
node -e "if (require('fs').readFileSync('leia-state.txt', 'utf8') !== 'ready') process.exit(1)"
```

## Cleanup

```sh
# Should clean up an ESM scenario
node -e "require('fs').unlinkSync('leia-state.txt')"
```
