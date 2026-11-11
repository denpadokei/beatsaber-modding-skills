# Beat Saber Modding Skills

[![skills.sh](https://skills.sh/b/denpadokei/beatsaber-modding-skills)](https://skills.sh/denpadokei/beatsaber-modding-skills)

Four agent skills that cover Beat Saber modding from both sides: **installing mods** and **building mods**. PC and Quest standalone are split because they are completely different workflows. BSML has its own deep-dive skill because it is the de facto PC in-game UI layer and its tag/type-handler/binding model is unlike a normal XML UI framework. ChroMapper is separate again: it is the map editor, not the game.

| Skill | Platform | Stack | Use it for |
| --- | --- | --- | --- |
| [`beatsaber-pc-modding`](skills/beatsaber-pc-modding/SKILL.md) | Steam / Oculus PC | C# + BSIPA + Harmony + BSML + SiraUtil | PC mod users and C# plugin developers |
| [`beatsaber-bsml-ui`](skills/beatsaber-bsml-ui/SKILL.md) | Steam / Oculus PC | C# + BSML (BeatSaberMarkupLanguage) | Deep BSML UI work: templates, settings, flow coordinators, floating screens, lists, bindings, custom tags |
| [`beatsaber-quest-modding`](skills/beatsaber-quest-modding/SKILL.md) | Quest 1/2/3/3S/Pro standalone | C++ + QPM + beatsaber-hook + custom-types + config-utils + BSML | Quest mod users and native mod developers |
| [`chromapper-plugin-modding`](skills/chromapper-plugin-modding/SKILL.md) | ChroMapper (Windows / macOS / Linux) | C# + .NET Framework 4.8 + Main.dll + Harmony + CMUI | ChroMapper plugin users and plugin developers |

## Companion MCP server (build without Visual Studio)

The PC skill covers the BSMT/MCP workflow in
[`references/bsmt-mcp.md`](skills/beatsaber-pc-modding/references/bsmt-mcp.md). The companion
[BeatSaberModdingToolsMCP](https://github.com/denpadokei/BeatSaberModdingToolsMCP) server exposes the
BSMT extension/task workflow to GitHub Copilot, Claude, Codex, and other MCP clients, and as the
`bsmt` CLI. It builds without Visual Studio:

```powershell
uvx --from git+https://github.com/denpadokei/BeatSaberModdingToolsMCP bsmt doctor
uvx --from git+https://github.com/denpadokei/BeatSaberModdingToolsMCP bsmt build .\MyMod -c Release --package --deploy
```

Setup for VS Code Copilot Chat (`mcp.json`) and Copilot CLI (`mcp-config.json`), the 24 tools, and
the project/item templates are documented in the reference above.

Beat Saber content is sourced from the [BSMG Wiki](https://bsmg.wiki/), the community's canonical documentation. BSML content additionally comes from the [BSML docs](https://monkeymanboy.github.io/BSML-Docs/) and the [BeatSaberMarkupLanguage source](https://github.com/monkeymanboy/BeatSaberMarkupLanguage). ChroMapper content is sourced from the [ChroMapper repository](https://github.com/Caeden117/ChroMapper), its [plugin guide](https://github.com/Caeden117/ChroMapper/blob/master/PLUGINS.md), and the [ChroMapper wiki](https://chromapper.atlassian.net/wiki/spaces/UG/overview). Each reference file links back to the exact page or source file it covers so an agent can re-check anything that may have changed.

## Quick start

The repo is laid out the way the [`skills`](https://skills.sh) CLI expects (`skills/<name>/SKILL.md`), so installation is one command. Requires Node.js 22.20 or later; run it from the project you want the skills in.

```bash
npx skills add denpadokei/beatsaber-modding-skills
```

The CLI detects the agents installed on your machine, then asks which skills to add, how to install them (symlink, or copy when symlinks are unavailable), and whether the install is project-scoped or global.

Non-interactive installs:

```bash
# all skills, GitHub Copilot, project scope (.agents/skills/)
npx skills add denpadokei/beatsaber-modding-skills --skill '*' -a github-copilot -y

# all skills for every detected agent, available in all projects
npx skills add denpadokei/beatsaber-modding-skills --all -g

# one skill only
npx skills add denpadokei/beatsaber-modding-skills --skill beatsaber-quest-modding
```

Inspect, update, and remove installed skills:

```bash
npx skills add denpadokei/beatsaber-modding-skills --list   # list skills without installing
npx skills list                                             # list installed skills
npx skills update                                           # pull the latest version
npx skills remove beatsaber-pc-modding                      # uninstall one skill
```

If you already cloned this repo, the same CLI works on the folder:

```bash
npx skills add ./beatsaber-modding-skills
```

## What is in a skill

Each skill uses progressive disclosure:

- `SKILL.md` is the small, always-loaded entry point: routing, non-negotiables, core workflow, failure modes, and links.
- `references/` holds the deep material, loaded only when a task needs it.
- `assets/` holds copy-pasteable templates (plugin skeleton, manifests, config headers, BSML views).

## Manual install

The CLI in [Quick start](#quick-start) is the recommended path. Use the layouts below when you need a vendored copy, an offline install, or a host with no `skills` CLI support.

### GitHub Copilot

Project scope:

```text
<your-repo>/.github/skills/beatsaber-pc-modding/SKILL.md
<your-repo>/.github/skills/beatsaber-bsml-ui/SKILL.md
<your-repo>/.github/skills/beatsaber-quest-modding/SKILL.md
<your-repo>/.github/skills/chromapper-plugin-modding/SKILL.md
```

Personal scope: copy the four folders under `skills/` into your user skills directory (for the Copilot app/CLI this is typically `~/.copilot/skills/`).

### Claude Code

```bash
# personal
cp -r skills/beatsaber-pc-modding       ~/.claude/skills/
cp -r skills/beatsaber-bsml-ui          ~/.claude/skills/
cp -r skills/beatsaber-quest-modding    ~/.claude/skills/
cp -r skills/chromapper-plugin-modding  ~/.claude/skills/

# or project
mkdir -p .claude/skills
cp -r skills/* .claude/skills/
```

On Windows PowerShell:

```powershell
Copy-Item -Recurse skills\beatsaber-pc-modding      $env:USERPROFILE\.claude\skills\
Copy-Item -Recurse skills\beatsaber-bsml-ui         $env:USERPROFILE\.claude\skills\
Copy-Item -Recurse skills\beatsaber-quest-modding   $env:USERPROFILE\.claude\skills\
Copy-Item -Recurse skills\chromapper-plugin-modding $env:USERPROFILE\.claude\skills\
```

### Any other SKILL.md host

Point the host at `skills/beatsaber-pc-modding/`, `skills/beatsaber-bsml-ui/`, `skills/beatsaber-quest-modding/`, and `skills/chromapper-plugin-modding/`. The only requirement is YAML frontmatter with `name` and `description` plus relative links that resolve inside the folder. If the host is on the [skills.sh supported list](https://github.com/vercel-labs/skills/blob/main/docs/agents.md), the CLI can do this for you with `-a <agent>`.

## Example prompts

- "My PC Beat Saber mods broke after the update. Walk me through downgrading."
- "Create a BSIPA plugin that shows a BSML settings tab and persists a toggle."
- "Build a BSML settings menu with a toggle, slider, dropdown, string, and color picker."
- "My BSML view is blank. Diagnose the parse error and fix the resource path."
- "Make a BSML custom-list of songs with page buttons and a per-row Use button."
- "Show a floating BSML panel during gameplay and clean it up on scene exit."
- "Write a Harmony postfix that logs every note cut and a prefix that cancels misses in practice mode."
- "My Quest mod crashes on startup. Here is the tombstone. Find the cause."
- "Add a `config-utils` config and a BSML-Lite settings page to this QPM project."
- "Package this Quest mod as a QMOD with a cover image and file copies."
- "Set up GitHub Actions to build on push and attach the zip to a `v*` tag release."
- "Build this mod with GitHub Copilot without opening Visual Studio."
- "ChroMapper won't load the plugin I put in the Plugins folder. What now?"
- "Create a ChroMapper plugin that adds a mapper toolbar button and a CMUI settings dialog."
- "Write a Harmony patch against ChroMapper's mapper scene and package the plugin for release."

## Scope

The Beat Saber PC and Quest skills cover the full path from "I want mods" to "I ship a mod": installation, downgrading, project setup, the platform's hooking/UI/config stack, debugging, packaging, and release.

The BSML UI skill is the deep-dive for the PC game's in-game UI layer. It covers the parser/binding model, every built-in tag, every type-handler attribute, settings apply/cancel semantics, lists and scroll views, flow coordinators, floating screens, macros, and custom tags.

The ChroMapper skill covers the map editor's plugin system: installing and troubleshooting plugins, setting up a `net48` project against `Main.dll`, loader callbacks, Harmony patches, CMUI dialogs, extension buttons, requirement checks, and release packaging.

Mapping, lighting, and 3D asset authoring are separate workflows; the skills point to the relevant wiki sections instead of duplicating them.

## Coverage

### Beat Saber

| Area | PC | Quest |
| --- | --- | --- |
| Install / update / downgrade mods | Yes | Yes |
| Manual mod installation | BSIPA + Plugins | MBF / QuestPatcher |
| Project setup and templates | BSMT (Rider / Visual Studio) or BSMT MCP/CLI | QPM + Android NDK |
| Language and runtime | C# / .NET Framework 4.7.2 / Unity 2022.3 | C++ / il2cpp / Unity |
| Hooking | Harmony (prefix, postfix, transpiler) | `beatsaber-hook` (`MAKE_HOOK_MATCH`) |
| Dependency injection | SiraUtil + Zenject | Manual / `custom-types` |
| Config | BSIPA `Config` | `config-utils` |
| UI | BSML | BSML / BSML-Lite |
| Debugging | IPA console, ILSpy, RUE, debug Unity build | `logcat`, tombstones, `ndk-stack` |
| Packaging | Release zip / BeatMods | `.qmod` / mod repositories |
| CI / releases | GitHub Actions + tag-triggered GitHub Release | GitHub Actions + tag-triggered GitHub Release |

### BSML UI

| Area | Coverage |
| --- | --- |
| Templates | `.bsml` XML, one root, embedded resources, resource naming, `DependentUpon` |
| Loaders | `BSMLAutomaticViewController`, `BSMLResourceViewController`, direct `BSMLParser.Parse`, hot reload |
| Binding | `[UIComponent]`, `[UIObject]`, `[UIValue]`, `[UIAction]`, `[UIParams]`, `~`, `#`, `tags` |
| Settings | Toggle, slider, increment, list, list-slider, dropdown, string, color, apply/cancel, `INotifyPropertyChanged` |
| Placement | Settings menu, gameplay setup tab, menu button, flow coordinator, floating screen, modals |
| Lists | `list`, `custom-list`, custom cells, selection, page buttons, `ReloadData()` |
| Scrolling | `scroll-view`, `scrollable-container`, `settings-container`, scroll focus and tagged controls |
| Styling | Anchors, layout groups, `ContentSizeFitter`, backgrounds, text, localization, sprites, animated images |
| Macros | `macro.if`, `macro.for-each`, `macro.define`, `macro.as-host`, `macro.reparent` |
| Extensions | Custom `BSMLTag`, `TypeHandler`, and `BSMLMacro` registration |
| Troubleshooting | Exception-by-exception diagnosis, blank UI, duplicated UI, binding, lists, hot reload |

### ChroMapper

| Area | Coverage |
| --- | --- |
| Install / update / remove plugins | `Plugins` folder, CML layout, Options → Plugins, uninstall by deletion |
| Troubleshooting | Path/permission checks, version mismatch, log and console, failure isolation |
| Project setup | .NET Framework 4.8, `ChroMapperDir`, `Main.dll` references, post-build deploy |
| Loader API | `[Plugin]`, `[Init]`, `[Exit]`, `[ObjectLoaded]`, playback callbacks |
| Hooking | Harmony via the bundled `0Harmony.dll` |
| UI | CMUI dialogs, extension buttons, component store |
| Map integration | `RequirementCheck` for `_requirements` / `_suggestions` |
| Packaging | DLL/folder zip, versioned releases, optional update manifest |
| Debugging | `ChroMapper.log`, in-game developer console, Unity source build |

## 日本語概要

Beat Saber の Modding と ChroMapper のプラグイン開発を扱う 4 つのエージェントスキルです。

- `beatsaber-pc-modding` — Steam / Oculus PC 版。BSManager などでの Mod 導入・ダウングレードと、C# + BSIPA + Harmony + BSML + SiraUtil による Mod 開発。
- `beatsaber-bsml-ui` — PC 版のゲーム内 UI を BSML で作るための深掘りスキル。`.bsml` テンプレート、組み込みタグ、type handler の属性、設定メニューの apply/cancel、リスト、フロークォーディネーター、フローティングスクリーン、マクロ、カスタムタグまで扱います。
- `beatsaber-quest-modding` — Quest 単体版。ModsBeforeFriday / QuestPatcher での導入と、C++ + QPM + beatsaber-hook + custom-types + config-utils + BSML によるネイティブ Mod 開発、QMOD パッケージング。
- `chromapper-plugin-modding` — ChroMapper（マップエディタ）のプラグイン導入・トラブルシュートと、.NET Framework 4.8 + Main.dll + Harmony + CMUI によるプラグイン開発。ChroMapper の「Mod」はすべてプラグインです。
- PC Mod のビルド用 MCP サーバー（Visual Studio 不要 / GitHub Copilot 対応）: [BeatSaberModdingToolsMCP](https://github.com/denpadokei/BeatSaberModdingToolsMCP)。使い方は [`bsmt-mcp.md`](skills/beatsaber-pc-modding/references/bsmt-mcp.md) を参照。

導入手順は上記の [Quick start](#quick-start) を参照してください。CLI では次の 1 コマンドで入ります。

```bash
npx skills add denpadokei/beatsaber-modding-skills
```

`--list` で内容の確認、`--skill <name>` で個別インストール、`-a github-copilot` で対象エージェント指定、`-g` で全プロジェクト共通になります。手動コピーは `Manual install` を参照してください。

各スキルは `SKILL.md` を入口に、必要になったときだけ `references/` の詳細を読みます。Beat Saber の内容は [BSMG Wiki](https://bsmg.wiki/)（MIT）、ChroMapper の内容は [ChroMapper リポジトリ](https://github.com/Caeden117/ChroMapper)（GPLv2）のプラグインガイドとソースを根拠に再構成しています。上流の方が新しい場合は上流を優先してください。

## Validation

The repo ships a dependency-free validator:

```bash
node scripts/validate.mjs
```

It checks frontmatter, Agent Skills naming rules, skill-name/directory agreement, description length, missing or orphaned reference files, broken relative links, and JSON template parsing. `npm test` runs the same check.

To confirm the repo is still installable with the skills.sh CLI, list it without installing:

```bash
npm run validate:cli
```

A GitHub Actions workflow runs both on every push.

## Sources and attribution

Beat Saber content is derived from the [BSMG Wiki](https://github.com/bsmg/wiki), licensed under the MIT License, Copyright (c) 2019-2023 Jack Baron, BSMG, and Contributors. Wiki text was rewritten and condensed for agent consumption; code patterns remain faithful to the source examples.

BSML content in `beatsaber-bsml-ui` is derived from the [BSML documentation](https://monkeymanboy.github.io/BSML-Docs/) and the [BeatSaberMarkupLanguage source](https://github.com/monkeymanboy/BeatSaberMarkupLanguage), licensed under the MIT License, Copyright (c) 2019 David L. Tag, type-handler, and parser behavior was read from the 1.14.2 source and rewritten for agent consumption; no BSML source or binaries are redistributed here.

ChroMapper content is derived from the [ChroMapper repository](https://github.com/Caeden117/ChroMapper), licensed under GPLv2, and the [ChroMapper wiki](https://chromapper.atlassian.net/wiki/spaces/UG/overview). The plugin guide (`PLUGINS.md`) and source files were rewritten, condensed, and cross-checked against the current loader implementation. No ChroMapper source code is redistributed here.

This is an unofficial community resource. It is not affiliated with Beat Games, BSMG, Meta, or the ChroMapper project. Beat Saber is a trademark of Beat Games. ChroMapper is a project by Caeden117 and contributors.

## License

MIT. See [LICENSE](LICENSE). Third-party attribution is in [NOTICE](NOTICE).
