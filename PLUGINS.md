# Leia for agents

Use the Leia skill in Codex or OpenClaw to author scenarios, diagnose tests, and configure GitHub
Actions. See the [README](./README.md) to install Leia in your project; the plugin supplies the skill
and reference docs. The agent needs file and command execution tools. Run Leia with Node 24 or newer, or use the
[Bun project script](./CLI.md#bun). Codex npm-source plugin installation requires the npm CLI;
that installation prerequisite is separate from the runtime used to execute Leia.

> [!WARNING]
> Leia commands can mutate your machine. Prefer ephemeral CI and follow the invoking repository's
> execution policy. See [execution safety](./ADVANCED.md#execution-safety).

## Codex

```sh
# register the marketplace and install its published leia bundle.
codex plugin marketplace add lando/leia --ref main
codex plugin add leia@lando-leia
codex plugin list
```

Start a new task and select Leia in the skill picker or ask to use it explicitly.
The marketplace selects stable `@lando/leia` releases in the `^2.0.0` range.

## OpenClaw

```sh
# install the same package as a compatible skill bundle.
openclaw plugins install npm:@lando/leia
openclaw plugins inspect leia
```

Enable the plugin if required by your host policy, then start a new agent session.
See [OpenClaw's compatible bundles](https://docs.openclaw.ai/plugins/bundles) for host requirements.

Both installation paths require a published package containing the bundle. For unpublished builds,
see [local plugin installation](https://github.com/lando/leia/blob/main/CONTRIBUTING.md#install-a-local-release-candidate).

## Use the skill

- **Run and diagnose:** “Use Leia to run this project's scenarios and explain the failures.”
- **Find and author:** “Find the strongest missing Leia scenario from these docs, implement it,
  and demonstrate that its assertion catches the wrong result.”
- **Configure CI:** “Run these scenarios in GitHub Actions on the operating systems we support.”
