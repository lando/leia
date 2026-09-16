# Leia

<p align="center">
  <img src="./skills/scenarios/assets/lando-logo.png" alt="Lando" width="180" />
</p>

Leia turns fenced commands in markdown into mocha tests. Keep runnable examples beside the prose
they explain, then prove the documentation still tells the truth.

Requires Node.js 24 or newer.

## Install

```sh
# Add Leia to your project's development dependencies.
npm install --save-dev @lando/leia
```

## Usage

### Write your first scenario

Save this as `quickstart.md`:

<!-- leia-example:quickstart-scenario -->

````md
# Leia quickstart

## Testing

```sh
# should print a greeting
echo "Hello from Leia"
```
````

The title names the suite, the `Testing` heading selects the commands, and each comment names a
test. Blank lines separate tests. See [scenario authoring](./ADVANCED.md#author-a-scenario)
for assertions, setup, and cleanup.

### Run with the CLI

<!-- leia-example:quickstart-command -->

```sh
# Run the locally installed Leia without downloading another version.
npm exec --offline -- leia quickstart.md
```

Leia reports one passing test. A command that exits nonzero, cannot start, or exceeds its deadline
fails the scenario.

```sh
# Equivalent when Leia is already on PATH, including inside an npm script.
leia quickstart.md

# Quote globs so Leia expands them; retry failed commands twice.
leia "docs/**/*.md" --retry 2
```

See the [CLI guide](./CLI.md) for npm scripts, all options,
and environment defaults.

### Run programmatically

Save as `test-docs.mjs` and run with `node test-docs.mjs`:

<!-- leia-example:readme-api -->

```js
import Leia from '@lando/leia';

const leia = new Leia();
// Compile the same markdown scenario.
const files = leia.find(['quickstart.md']);
const sources = leia.parse(files, { moduleFormat: 'esm' });
const harnesses = leia.generate(sources);
const runner = await leia.runAsync(harnesses);

// Return a failing exit status when any test fails.
runner.run((failures) => {
  process.exitCode = failures ? 1 : 0;
});
```

The [API reference](./API.md) includes CommonJS usage,
TypeScript declarations, and every supported export.

### Run in GitHub Actions

Commit `quickstart.md`, `package.json`, and `package-lock.json`, then save this workflow as
`.github/workflows/leia.yml`:

<!-- leia-example:github-actions -->

```yaml
name: Leia
on: [push, pull_request]
permissions:
  contents: read
jobs:
  scenarios:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
      # Install the versions recorded in your project's lockfile.
      - run: npm ci
      # A failing scenario fails the job.
      - run: npm exec --offline -- leia quickstart.md
```

See [GitHub Actions](./GITHUB_ACTIONS.md) for a platform
matrix and scenario prerequisites.

### Use with an agent

Install the Leia plugin for Codex or OpenClaw, then ask:

> Use Leia to find a useful missing scenario in this project, implement it, and run it.

The skill can also run and diagnose existing tests or configure their GitHub Actions matrix.
See [plugin installation](./PLUGINS.md) for both hosts,
prerequisites, and example requests.

## Development

Leia uses pinned Bun tooling and TypeScript source. [CONTRIBUTING](https://github.com/lando/leia/blob/2.x/CONTRIBUTING.md)
covers setup, validation, builds, and releases.

## Issues, questions, and support

Join the [Lando Slack community](https://launchpass.com/devwithlando) for community help.
Report bugs and request features through the [issue queue](https://github.com/lando/leia/issues/new/choose).

## Changelog

See the [changelog](https://github.com/lando/leia/blob/2.x/CHANGELOG.md) and
[published releases](https://github.com/lando/leia/releases).

## Maintainers

- [@pirog](https://github.com/pirog)
- [@reynoldsalec](https://github.com/reynoldsalec)

## Contributors

<a href="https://github.com/lando/leia/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=lando/leia" alt="Leia contributors" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

## License and policies

- [MIT License](./LICENSE)
- [Lando Terms of Use](https://docs.lando.dev/terms)
- [Lando Privacy Policy](https://docs.lando.dev/privacy)
- [Lando Code of Conduct](https://docs.lando.dev/coc)
