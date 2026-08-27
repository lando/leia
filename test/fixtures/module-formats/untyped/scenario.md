# Untyped Module Format

## Setup

```sh
# Should prepare an untyped scenario
node -e "require('fs').writeFileSync('leia-state.txt', 'ready')"
```

## Testing

```sh
# Should run from an untyped package
node -e "if (require('fs').readFileSync('leia-state.txt', 'utf8') !== 'ready') process.exit(1)"
```

## Cleanup

```sh
# Should clean up an untyped scenario
node -e "require('fs').unlinkSync('leia-state.txt')"
```
