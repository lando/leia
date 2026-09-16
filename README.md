# Leia

<p align="center">
  <img src="./skills/scenarios/assets/lando-logo.png" alt="Lando" width="180" />
</p>

Leia turns fenced commands in markdown into mocha tests. Keep runnable examples beside the prose
they explain, then prove the documentation still tells the truth.

Runs on Node.js 24 or newer, or Bun with [explicit invocation](./CLI.md#bun).

> [!WARNING]
> Leia executes real commands that can change files, install software, or alter your machine.
> Prefer ephemeral CI runners. Before running locally, read the scenarios and repository guidance;
> a temporary working directory does not isolate machine-wide changes.

## Install

```sh
# add leia to your project's development dependencies.
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
# run the locally installed leia without downloading another version.
npm exec --offline -- leia quickstart.md
```

Leia reports one passing test. A command that exits nonzero, cannot start, or exceeds its deadline
fails the scenario.

```sh
# equivalent when leia is already on path, including inside an npm script.
leia quickstart.md

# quote globs so leia expands them; retry failed commands twice.
leia "docs/**/*.md" --retry 2
```

For Bun projects, define `"leia": "bun ./node_modules/.bin/leia"` in `package.json` scripts, then
run `bun run leia quickstart.md`. See [Bun invocation](./CLI.md#bun) for installation and CI.

See the [CLI guide](./CLI.md) for npm scripts, all options,
and environment defaults.

### Run programmatically

Save as `test-docs.mjs` and run with `node test-docs.mjs`:

<!-- leia-example:readme-api -->

```js
import Leia from '@lando/leia';

const leia = new Leia();
// compile the same markdown scenario.
const files = leia.find(['quickstart.md']);
const sources = leia.parse(files, { moduleFormat: 'esm' });
const harnesses = leia.generate(sources);
const runner = await leia.runAsync(harnesses);

// return a failing exit status when any test fails.
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
on:
  pull_request:
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
      - run: npm ci
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

Leia uses pinned Bun tooling and TypeScript source. [CONTRIBUTING](https://github.com/lando/leia/blob/main/CONTRIBUTING.md)
covers setup, validation, builds, and releases.

## Issues, questions, and support

Leia 1.x is unsupported. Upgrade to 2.x; see the [migration notes](./ADVANCED.md#upgrade-from-1x).

Join the [Lando Slack community](https://launchpass.com/devwithlando) for community help.
Report bugs and request features through the [issue queue](https://github.com/lando/leia/issues/new/choose).

## Changelog

See the [changelog](https://github.com/lando/leia/blob/main/CHANGELOG.md) and
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
