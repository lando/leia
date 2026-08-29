# Contributing to Leia

Leia welcomes focused bug fixes, features, tests, and documentation improvements. Open an issue first when a change
needs design discussion or when you are unsure whether it fits the project.

## Local setup

Leia requires Node.js 24 or newer. The root `.node-version` is the runtime authority.

```bash
git clone https://github.com/lando/leia.git
cd leia
npm install
```

If you prefer not to install Node.js locally, use
[Lando](https://docs.lando.dev/basics/installation.html):

```bash
git clone https://github.com/lando/leia.git
cd leia
lando start
```

The Lando app exposes `node`, `npm`, and `npx` commands through its Node 24 service.

## Validate changes

Run the focused local checks before opening a pull request:

```bash
npm run lint
npm run test:unit
```

With Lando, prefix those commands with `lando`, for example `lando npm run lint`.

The full Leia, shell, module-format, and operating-system scenarios run in CI. Add or update the narrowest unit test or
executable example that owns the behavior you changed.

## Open a pull request

- Keep the change focused and connect it to its issue when one exists.
- Update the README and unreleased changelog when behavior changes for users or developers.
- Describe what changed and include the validation you ran.
- Make sure the automated checks pass before requesting review.

For help, join the `#contributors` channel in the
[Lando Slack community](https://www.launchpass.com/devwithlando).
