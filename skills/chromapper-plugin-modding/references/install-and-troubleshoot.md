# ChroMapper: Install and Troubleshoot Plugins

Canonical pages: [Plugin guide](https://github.com/Caeden117/ChroMapper/blob/master/PLUGINS.md) · [Settings - Plugins](https://chromapper.atlassian.net/wiki/spaces/UG/pages/2916361/Settings+-+Plugins) · [FAQ](https://chromapper.atlassian.net/wiki/spaces/UG/pages/806682666)

## What a plugin is

ChroMapper's only extension mechanism is the plugin: a managed `.dll` placed under `Plugins`. The editor's own loader scans that folder at startup, constructs every exported type carrying `[Plugin]`, and calls its `[Init]` method. ChroMapper does not provide a separate "mod" format, a downloader, or a dependency manager.

## Where the folder is

The folder is `Plugins` **relative to the ChroMapper executable**:

```text
<ChroMapper install>\
├── ChroMapper.exe
├── ChroMapper_Data\
│   └── Managed\          <- Main.dll and Unity assemblies live here
└── Plugins\              <- plugins go here
```

The recommended install path is the ChroMapper Launcher (CML): <https://cm.topc.at/dl>. CML downloads and patches ChroMapper into a `chromapper` folder next to `CML.exe`. A common layout is:

```text
C:\TOOL\ChroMapper\
├── CML.exe
└── chromapper\
    ├── ChroMapper.exe
    ├── ChroMapper_Data\
    └── Plugins\
```

If `Plugins` does not exist, **Options → Plugins → Open Plugins Folder** creates it and opens it in the file browser. The loader also creates it on startup if it is missing.

Use a plain-ASCII, user-writable path. The wiki FAQ calls out restricted locations such as the Windows `Downloads` folder as the usual cause of plugins not loading; the Japanese setup guide recommends a folder such as `C:\TOOL\ChroMapper` with only half-width alphanumerics.

## Install, update, remove

1. Close ChroMapper. A running instance locks plugin DLLs.
2. Extract the release into `Plugins`. Either drop the single DLL there or copy the whole plugin folder, including any bundled dependencies. The loader searches `Plugins` recursively.
3. Start ChroMapper.
4. Open **Options → Plugins**. Each loaded plugin is listed with its display name and `v<assembly version>`; the header shows `Loaded Plugins: <count>`. The tab hides itself when the count is zero.
5. To update, replace the old DLL or folder while ChroMapper is closed. To remove, delete the DLL or folder. There is no enable/disable, no uninstaller, and no plugin settings page in ChroMapper itself.

Uninstalling ChroMapper is done by deleting the `chromapper` folder next to the launcher, then letting CML reinstall. Plugins live inside that folder and are removed with it.

## Where plugins come from

There is **no official plugin repository**. Distribution is community-driven:

| Channel | Notes |
| --- | --- |
| ChroMapper Discord, `#plugins` | The FAQ points here for the recommended error checker, CM-JS. Invite: <https://discord.gg/YmEt9EZ8pw> |
| GitHub Releases | Most plugins publish a DLL or zip and state the ChroMapper build they were tested on |
| Wiki plugin list | Lists [CM-ErrorChecker](https://github.com/Top-Cat/CM-ErrorChecker/releases/latest) and [CM-OSC](https://github.com/Top-Cat/CM-OSC/releases/latest) |

Notable community plugins, useful when a user describes a feature rather than a name:

| Plugin | What it does |
| --- | --- |
| CM-JS / CM-ErrorChecker | Error checking plus user JavaScript checks; the editor's de facto replacement for MMA2's error checker. The original is [Top-Cat/CM-ErrorChecker](https://github.com/Top-Cat/CM-ErrorChecker); a newer community fork is [XAce1337manX/CM-ErrorChecker](https://github.com/XAce1337manX/CM-ErrorChecker) |
| ChroMapper-AutoModder | Auto-checking, comments, and review workflow aimed at BeatLeader ranking |
| CM-OSC | Sends ChroMapper state over OSC |
| ChroMapper-UpdateChecker | Flags outdated plugins by reading an embedded `manifest.json` |

Do not assume a Beat Saber mod repository carries ChroMapper plugins. The BeatMods ecosystem targets Beat Saber; ChroMapper plugins are published by their authors.

## Version compatibility

ChroMapper has **no plugin API version and no compatibility check**. The loader loads any DLL it finds, then fails later if types or methods no longer exist. Consequences:

- Pin releases to a ChroMapper build, and say so in the release title and README. `ChroMapper-AutoModder` does this explicitly, for example "for ChroMapper v0.13.892 (Stable Release Channel)".
- A plugin built for a stable build may work on a nearby dev build, but it is not guaranteed. Treat dev builds as unsupported until tested.
- When ChroMapper updates and a plugin breaks, the fix is a rebuilt plugin, not a config change.
- The loader displays `AssemblyName.Version`, so a plugin's version in the UI is its assembly version, not the GitHub tag.

## Troubleshooting

| Symptom | Checks and fixes |
| --- | --- |
| Plugin never appears in Options → Plugins | Confirm the path is `<folder containing ChroMapper.exe>\Plugins`, not `ChroMapper_Data\Plugins`. Confirm the file ends in `.dll`. Confirm the DLL is readable and not quarantined by antivirus. |
| Plugin appears only sometimes | Close ChroMapper before copying; a locked DLL silently stays old. Re-copy and restart. |
| "Incompatible plugin X, please check for an update or remove it!" | The loader constructed the type and it threw, or the constructor failed. Usual causes: the class is not public, has no public parameterless constructor, has two methods with the same loader attribute, or has a missing dependency. Update or remove it. |
| Plugin loads but its feature is missing | Built for another ChroMapper version, a Harmony target moved, or a bundled dependency is missing. Check the log for the first exception, then rebuild. |
| Every plugin stopped loading after adding one | The scan is not failure-isolated: `Assembly.LoadFile` and `GetExportedTypes()` run outside the per-type try/catch. One bad DLL can abort the rest of the scan. Move DLLs out in halves until loading returns. |
| ChroMapper will not start after installing a plugin | Remove the newest plugin and retry. Then bisect. |
| Plugin works on Windows but not on macOS/Linux | Plugins are .NET Framework assemblies; support depends on the plugin and the platform build. Do not promise parity. |

Installing into `Program Files` can require elevation. Prefer a user-writable folder; a plugin that asks for Administrator rights is suspicious.

## Logs and console

- ChroMapper writes `ChroMapper.log` under Unity's persistent data path. On Windows:

  ```text
  %USERPROFILE%\AppData\LocalLow\BinaryElement\ChroMapper\ChroMapper.log
  ```

- The in-game developer console auto-opens for errors, exceptions, and non-important errors when enabled. It also inspects stack traces and prints:

  ```text
  The following exception is caused by the '<plugin>' plugin, please check for an update or remove it!
  ```

  This is the fastest way to attribute a crash to a plugin.
- `Debug.Log`, `Debug.LogWarning`, and `Debug.LogException` from a plugin all land in the same log. Ask users for the whole file, not a screenshot of one line.
- A plugin's `[Init]` failure logs `Error Loading Plugin: <name> - v<version>` and still leaves the plugin in the loaded list. The UI listing alone does not prove the plugin initialised successfully.

## Security model

ChroMapper loads plugins in-process with full user rights. There is no signature verification, no sandbox, no permission prompt, and no virus scanning. The in-game Plugins tab carries this warning:

> ChroMapper developers will not be held liable for any damage caused by loaded plugins. It is up to the user to decide which plugins they want to install. We recommend finding plugins made by trustworthy developers. For example, look for ChroMapper plugins that are open source, where its internal source code is available for all to look through and make their own informed decisions.

Practical rules:

- Prefer open-source plugins with a public build.
- Download from the author's GitHub release or the Discord `#plugins` channel, not from reupload sites.
- Delete the plugin if the source is unavailable and the author is unknown.
- A plugin can read and write maps, settings, and any file the user can access. Treat it with the same trust as any desktop application.

## macOS and Linux

CML ships builds for Windows, macOS, and Linux, and ChroMapper itself is cross-platform. The plugin format is the same: a managed DLL under `Plugins` next to the executable. Paths and permissions differ:

- Use a path the user owns; avoid system directories.
- The same version-matching and failure-isolation rules apply.
- The log path follows Unity's persistent data path for the platform; the in-game console is the reliable fallback.

## Sources

- PLUGINS.md: <https://github.com/Caeden117/ChroMapper/blob/master/PLUGINS.md>
- Plugin loader: <https://github.com/Caeden117/ChroMapper/blob/master/Assets/__Scripts/PluginLoader/PluginLoader.cs>
- Plugins options controller: <https://github.com/Caeden117/ChroMapper/blob/master/Assets/__Scripts/UI/Options/OptionsController.cs>
- Loaded plugins UI: <https://github.com/Caeden117/ChroMapper/blob/master/Assets/__Scripts/UI/Options/Plugins/LoadedPluginsController.cs>
- Dev console: <https://github.com/Caeden117/ChroMapper/blob/master/Assets/__Scripts/UI/DevConsole.cs>
- Wiki FAQ: <https://chromapper.atlassian.net/wiki/spaces/UG/pages/806682666>
- Wiki CML: <https://chromapper.atlassian.net/wiki/spaces/UG/pages/1077673985/CML>
- Japanese setup guide: <https://note.com/rynan/n/nb1aa807bea9d>
