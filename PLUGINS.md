# Leia for agents

Install Leia's shared skill in Codex or OpenClaw to author scenarios, run and diagnose tests, or
configure their GitHub Actions coverage. Return to the [README](./README.md) for Leia itself.

## Prerequisites

The plugin supplies instructions and reference docs. Tests use the Leia dependency installed in
your project, which requires Node.js 24 or newer. The agent needs file and command execution tools;
it does not need a Leia MCP server, Codex-specific tools, or an OpenClaw runtime extension.

Install the project dependency using the [README](./README.md#install). Review scenario commands
before executing them: they run real programs with your environment and permissions.

The registry commands below require a published Leia package containing the plugin bundle. For an
unpublished checkout or release candidate, use the local installation procedure instead.

## Codex

The repository's marketplace lists `@lando/leia` as an npm-backed plugin:

```sh
# Register the Leia marketplace from its release branch.
codex plugin marketplace add lando/leia --ref 2.x

# Install its published npm bundle.
codex plugin add leia@lando-leia

# Confirm the plugin appears in the catalog.
codex plugin list
```

Start a new task so the installed skill is discovered. Select Leia in the plugin or skill picker,
or ask explicitly to use the Leia skill. CLI spellings can vary across Codex versions; check
`codex plugin --help` if your client does not expose `add`.

Codex fetches npm plugin packages without running lifecycle scripts. The npm package therefore
contains the finished skill, logo, and reference docs; no build or project installation happens
when the plugin is added. See [Codex package sources](https://developers.openai.com/plugins/build/plugins).

## OpenClaw

```sh
# Install the same published npm package as a compatible skill bundle.
openclaw plugins install npm:@lando/leia

# Verify that OpenClaw recognizes the Codex-format bundle and its skill root.
openclaw plugins inspect leia
```

Enable the bundle if your plugin policy requires it, then start a new agent session. The skill uses
👸 in OpenClaw metadata. It does not register Gateway tools, services, or hooks.

Use an exact package version or an explicit prerelease tag when selecting a release candidate.
See [OpenClaw installation](https://docs.openclaw.ai/cli/plugins/install) and
[compatible bundles](https://docs.openclaw.ai/plugins/bundles) for host policy and version requirements.

## Install a local release candidate

Build and pack from a checkout using the contributor toolchain:

```sh
# Verify package contents and write the tarball under .temp/package/.
bun run build
bun run check:package --pack-destination=.temp/package
```

For OpenClaw, pass the resulting `.tgz` path to `openclaw plugins install`.
For Codex, extract the tarball into an empty directory, then create this marketplace file beside
the extracted `package/` directory as `.agents/plugins/marketplace.json`:

```json
{
  "name": "leia-local",
  "plugins": [
    {
      "name": "leia",
      "source": { "source": "local", "path": "./package" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity"
    }
  ]
}
```

Run these commands from that directory:

```sh
# Register and install the extracted artifact.
codex plugin marketplace add .
codex plugin add leia@leia-local
```

The local catalog is for testing an artifact. It does not follow npm updates. Repack and reinstall
when reviewing another candidate. Keep local and published installs separate to avoid duplicate skills.

## Use the skill

- **Run and diagnose:** “Use Leia to run this project's scenarios and explain the failures.”
- **Find and author:** “Find the strongest missing Leia scenario from these docs, implement it,
  and demonstrate that its assertion catches the wrong result.”
- **Configure CI:** “Run these scenarios in GitHub Actions on the operating systems we support.”

The skill checks existing project conventions, uses the installed CLI, and reports missing
prerequisites. It should ask for the expected behavior when the available evidence does not establish
it. Installing the plugin does not grant permission to execute destructive scenarios or publish changes.

## Verify the installation

Confirm the bundle and skill are listed, then use a new session to run the README's small scenario
in a disposable project. Inspect the selected Leia version, command, exit status, and reported result.
For authoring, require a meaningful assertion; for CI, inspect the generated matrix and actual job
results. Plugin detection alone does not prove an agent invoked the skill or that remote CI passed.

If the skill is missing, check that your host supports Codex-format skill bundles, that it loaded
the expected package version, and that the plugin is enabled under its local policy. If Leia itself
is missing, install the project dependency rather than executing private files from the plugin cache.
