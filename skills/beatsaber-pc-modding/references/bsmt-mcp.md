# PC: Building with the BSMT MCP Server

Companion project: <https://github.com/denpadokei/BeatSaberModdingToolsMCP> · Releases: <https://github.com/denpadokei/BeatSaberModdingToolsMCP/releases>

The BSMT MCP server is a Python reimplementation of the [BeatSaberModdingTools](https://github.com/Zingabopp/BeatSaberModdingTools) Visual Studio extension and [BeatSaberModdingTools.Tasks](https://github.com/Zingabopp/BeatSaberModdingTools.Tasks) MSBuild tasks. It exposes the same workflow as MCP tools and as the `bsmt` CLI, so an AI agent can create, fix, build, package, and deploy a PC mod without opening Visual Studio.

Use it when:

- The user works through GitHub Copilot, Claude, Codex, or another MCP client.
- Visual Studio is not installed (Build Tools or the .NET SDK is enough).
- The agent needs to run the build itself and read compiler diagnostics.
- The project already uses BSMT/BuildTools and needs `BeatSaberDir`, references, manifest, or a release zip fixed.

## Requirements

- Windows with a Beat Saber PC install (Steam, Oculus, or a BSManager instance).
- Python 3.10+; `uv` provides `uvx`.
- MSBuild from Visual Studio Build Tools for legacy `.csproj`, or the .NET SDK for SDK-style projects and `net472`.
- NuGet access on the first build unless the packages are already cached.

`bsmt doctor` reports the detected game, MSBuild, dotnet, and git.

## Setup

### One-off CLI use

```powershell
uvx --from git+https://github.com/denpadokei/BeatSaberModdingToolsMCP bsmt doctor
uvx --from git+https://github.com/denpadokei/BeatSaberModdingToolsMCP bsmt inspect .\MyMod
```

Install it once if the agent will call it repeatedly:

```powershell
uv tool install git+https://github.com/denpadokei/BeatSaberModdingToolsMCP
bsmt doctor
```

### GitHub Copilot

VS Code Copilot Chat uses the user `mcp.json` (Windows: `%APPDATA%\Code\User\mcp.json`):

```json
{
  "servers": {
    "beatSaberModdingTools": {
      "type": "stdio",
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/denpadokei/BeatSaberModdingToolsMCP",
        "bsmt-mcp"
      ]
    }
  }
}
```

After saving, run `Developer: Reload Window`, then start and trust the server from `MCP: List Servers`.

GitHub Copilot CLI uses `~/.copilot/mcp-config.json` (or `COPILOT_HOME/mcp-config.json`):

```json
{
  "mcpServers": {
    "beatSaberModdingTools": {
      "type": "local",
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/denpadokei/BeatSaberModdingToolsMCP",
        "bsmt-mcp"
      ],
      "tools": ["*"],
      "timeout": 900000
    }
  }
}
```

The same entry can be added with:

```powershell
copilot mcp add beatSaberModdingTools --timeout 900000 -- uvx --from "git+https://github.com/denpadokei/BeatSaberModdingToolsMCP" bsmt-mcp
copilot mcp list
```

Use a long timeout (15 minutes) so `build_mod` has time to restore and compile.

### Other MCP clients

Use `uvx --from git+https://github.com/denpadokei/BeatSaberModdingToolsMCP bsmt-mcp` as a stdio server. The first launch clones the repository, builds a wheel, and caches it; later launches are fast.

## Typical agent workflow

| Step | Tool | What it does |
| --- | --- | --- |
| 1 | `detect_game` | Finds Steam / Oculus / BSManager installs and the game version. |
| 2 | `inspect_project` | Reports references, `BeatSaberDir`, manifest, assembly version, and BSMT status. |
| 3 | `set_game_directory` | Writes `BeatSaberDir` / `GameDirectory` to the project, `.csproj.user`, or `Directory.Build.props`. |
| 4 | `add_game_references` | Adds missing game DLLs with `$(BeatSaberDir)` HintPaths. Presets: `core`, `bsipa`, `bsml`, `sira`, `harmony`, `newtonsoft`, `zenject`. |
| 5 | `generate_manifest` / `set_version` | Merges and validates `manifest.json`, embeds it as `<AssemblyName>.manifest.json`, and keeps `AssemblyInfo` in sync. |
| 6 | `build_mod` | Runs `dotnet build` or MSBuild and returns `ok`, diagnostics, target path, and a preflight list. |
| 7 | `package_mod` / `deploy_mod` | Creates the BeatMods-style zip and copies to `Plugins` or `IPA/Pending`. |

`build_mod` accepts `package=true` and `deploy=true`, so steps 6–7 can be one call. Check `ok` in the result and read `build.diagnostics.errors` on failure; expected failures are returned as data, not swallowed.

### Typical requests

- "Find my Beat Saber install and fix this project's references."
- "Build this mod in Release, make the zip, and copy it into the game."
- "The manifest version and assembly version do not match; fix both."
- "This project was made from the BSMT template; make it build without Visual Studio."

## Templates

The server vendors the official [UnityModdingTools.Templates.BeatSaber](https://github.com/denpadokei/UnityModdingTools.Templates.BeatSaber) templates from the `denpadokei-dev` branch:

```powershell
# Project templates: sdk (default), bare, core, disableable
bsmt create .\MyMod --template core --name "My Mod" --game "D:\...\Beat Saber"

# Item templates: harmony-patch, bsml-file, bsml-viewcontroller, monobehaviour
bsmt item add .\MyMod --template harmony-patch --name MyPatch --directory Patches
bsmt item add .\MyMod --template bsml-viewcontroller --name SettingsView --directory UI
```

The MCP equivalents are `create_project(template="core")`, `add_item_template(template="bsml-viewcontroller")`, and `list_templates`. Item templates add the needed references (`0Harmony`, `BSML`, `BeatSaber.ViewSystem`) and update the `.csproj` with `Compile` / `EmbeddedResource` items.

## CLI equivalents

```powershell
bsmt detect
bsmt inspect .\MyMod
bsmt setup .\MyMod --target user
bsmt refs add .\MyMod --preset core --preset bsipa
bsmt manifest validate .\MyMod
bsmt set-version .\MyMod 1.2.3
bsmt build .\MyMod -c Release --package --deploy
```

All commands print JSON and exit non-zero when `ok` is false. `bsmt --help` lists the full surface.

## Safety and limits

- Prefer an explicit `game_dir` or `BeatSaberDir` when multiple versions are installed; the agent can otherwise pick the BSManager last-launched instance.
- `deploy_mod` writes to `IPA/Pending` while `Beat Saber.exe` is running. Restart the game to apply, exactly like BSMT.
- Do not mix assemblies from different game versions. Confirm the target version before building.
- First launch requires network access to fetch the repository and NuGet packages; subsequent runs use the uv and NuGet caches.
- The server is a replacement for the IDE convenience features, not for testing. Test the mod in-game with `--verbose` before releasing.
- If the MCP server is unavailable, the same workflow is available through the `bsmt` CLI above or the original BSMT extension.

## Links

- Repository and README: <https://github.com/denpadokei/BeatSaberModdingToolsMCP>
- Releases: <https://github.com/denpadokei/BeatSaberModdingToolsMCP/releases>
- BSMT VS extension behavior: [project-setup.md](project-setup.md)
- CI and release builds: [automated-builds.md](automated-builds.md)

