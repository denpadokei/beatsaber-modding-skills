---
name: chromapper-plugin-modding
description: ChroMapper plugin modding for Beat Saber mappers. Use when installing, removing, or troubleshooting ChroMapper plugins (Plugins folder, CM-JS, AutoModder, UpdateChecker), or when building a plugin against .NET Framework 4.8, Main.dll, Harmony, CMUI dialogs, ExtensionButtons, and RequirementCheck. Triggers on ChroMapper, CM plugin, ChroMapperDir, Main.dll, 0Harmony, CMUI, CreateNewDialogBox, ExtensionButtons, and vague requests about modding the map editor.
license: MIT
metadata:
  version: "1.0.0"
  platform: "ChroMapper (Windows / macOS / Linux)"
  canonical_source: "https://github.com/Caeden117/ChroMapper/blob/master/PLUGINS.md"
---

# ChroMapper Plugin Modding

ChroMapper is the Unity-based Beat Saber map editor. Everything the community calls a ChroMapper "mod" is a **plugin**: a managed DLL dropped into the `Plugins` folder next to `ChroMapper.exe`. There is no second extension format, no package manager, and no official plugin catalog.

This skill covers both sides: **using** plugins and **building** them. For Beat Saber itself, use `beatsaber-pc-modding` or `beatsaber-quest-modding`; none of this applies to the game.

The primary documentation is the in-repo [plugin guide](https://github.com/Caeden117/ChroMapper/blob/master/PLUGINS.md) plus the source itself. There is no separate API reference site, and parts of the guide are out of date, so verify signatures against `Assets/__Scripts/`.

## 1. Decide the job

| User intent | Go to |
| --- | --- |
| "Install a plugin", "where is the Plugins folder", "CM doesn't load it" | [Install and troubleshoot](references/install-and-troubleshoot.md) |
| "Make a ChroMapper plugin", "set up a project", "ChroMapperDir" | [Project setup](references/project-setup.md) |
| `[Plugin]`, `[Init]`, `[Exit]`, loader behaviour, RequirementCheck | [Plugin API](references/plugin-api.md) |
| "Patch ChroMapper", "Harmony", "add a button", "CMUI dialog" | [CMUI, Harmony, and scenes](references/cmui-and-harmony.md) |
| "Release", "share it", "update manifest", "GPL" | [Distribution and support](references/distribution-and-support.md) |

## 2. Non-negotiables

1. **Version is everything, and the loader does not check it.** A plugin is compiled against one ChroMapper build. There is no API version, no compatibility metadata, and no automatic disable. Confirm the target build before installing or developing.
2. **Install into a writable folder whose path is plain ASCII.** The ChroMapper Launcher installs a `chromapper` folder next to the launcher. Restricted locations such as `Downloads`, and paths with non-ASCII characters, are known causes of plugins not loading.
3. **A plugin is unrestricted in-process code.** It runs with the user's rights. ChroMapper does not sandbox plugins, permission-check them, or verify their signatures. Only install plugins whose source you can inspect, and tell users the same.
4. **Never ship ChroMapper or Unity assemblies with a plugin.** Reference `Main.dll`, `Plugins.dll`, `0Harmony.dll`, and Unity modules with **Copy Local = false**. Duplicate copies in `Plugins` cause type-identity conflicts and broken Harmony patches.
5. **The `[Plugin]` type must be public with a public parameterless constructor.** The loader only scans exported types and constructs them with `Activator.CreateInstance`.
6. **One method per callback attribute.** Two `[Init]` methods (or two of any loader attribute) make the plugin throw while it is being constructed, and ChroMapper reports it as incompatible.
7. **Test in the built game, not the Unity Editor.** `PluginLoader` has `loadPluginsInEditor = false`; plugins are only scanned in a player build.
8. **Treat `PLUGINS.md` as a starting point, not current API documentation.** Parts of it lag the source: it still documents `PersistentUI.Instance.CreateDialogBox()` (now `CreateNewDialogBox()`) and an older `RequirementCheck` signature. Verify against `Assets/__Scripts/` in the ChroMapper repository.

## 3. Use: install fast path

1. Install ChroMapper through the [ChroMapper Launcher](https://cm.topc.at/dl) (CML). CML creates and updates a `chromapper` folder next to itself. Example: `C:\TOOL\ChroMapper\chromapper\`.
2. Put the plugin `.dll` into `...\chromapper\Plugins\`. Nested subfolders are allowed; the loader searches `Plugins` recursively for `*.dll`.
3. If the release is a folder or zip with dependency DLLs, copy the whole folder into `Plugins`, not just the main DLL.
4. Start ChroMapper and open **Options → Plugins**. The tab lists each loaded plugin as `Name` + `v<assembly version>`.
5. To uninstall, delete the plugin's DLL or folder and restart. There is no in-app enable/disable.
6. If the plugin is not listed: confirm the folder, move ChroMapper out of `Downloads` or `Program Files`, remove non-ASCII characters from the path, then read the log. Full steps: [install-and-troubleshoot.md](references/install-and-troubleshoot.md).

There is no official plugin store. The community distributes plugins through the `#plugins` channel of the [ChroMapper Discord](https://discord.gg/YmEt9EZ8pw) and through GitHub releases. The wiki lists [CM-ErrorChecker (CM-JS) and CM-OSC](https://chromapper.atlassian.net/wiki/spaces/UG/pages/2916361/Settings+-+Plugins).

## 4. Develop: the loop

```text
match a ChroMapper build -> set ChroMapperDir -> create a net48 class library
-> add [Plugin] + [Init] -> build into Plugins -> launch ChroMapper -> read ChroMapper.log -> repeat
```

1. **Environment.** Windows, Visual Studio 2022 or Rider, the .NET Framework 4.8 targeting pack, and the same ChroMapper build you will test on. Full steps: [project-setup.md](references/project-setup.md).
2. **Reference the installed game.** Point `$(ChroMapperDir)` at the folder containing `ChroMapper.exe`; assemblies come from `ChroMapper_Data\Managed\`. Do not use NuGet versions.
3. **Start from a working skeleton.** Use [ChroMapperPlugin.csproj.txt](assets/ChroMapperPlugin.csproj.txt), [Plugin.cs.txt](assets/Plugin.cs.txt), and [HarmonyPatch.cs.txt](assets/HarmonyPatch.cs.txt) together (delete the `HarmonyPatch.cs` compile item if you do not need a patch), or one of the community templates listed in [project-setup.md](references/project-setup.md).
4. **Choose the extension surface** from the table below.
5. **Build and copy.** The template's post-build step writes the DLL into `$(ChroMapperDir)\Plugins`.
6. **Verify.** The Options → Plugins tab should list the plugin at the version from `AssemblyName.Version`. Then exercise the feature.
7. **Debug from the log.** `Debug.Log` and exceptions go to `ChroMapper.log`; the in-game console attributes exceptions to the plugin assembly that caused them.

## 5. Extension surfaces

| Surface | Use for | API |
| --- | --- | --- |
| Loader callbacks | Startup, shutdown, playback and object events | `[Plugin]`, `[Init]`, `[Exit]`, `[ObjectLoaded]`, `[EventPassedThreshold]`, `[NotePassedThreshold]` — see [plugin-api.md](references/plugin-api.md) |
| Harmony | Change existing ChroMapper behaviour, add UI to existing screens | `0Harmony.dll`, `[HarmonyPatch]` — see [cmui-and-harmony.md](references/cmui-and-harmony.md) and [HarmonyPatch.cs.txt](assets/HarmonyPatch.cs.txt) |
| CMUI | Dialogs with toggles, sliders, text boxes, dropdowns, colour pickers | `PersistentUI.Instance.CreateNewDialogBox()` — see [cmui-and-harmony.md](references/cmui-and-harmony.md) |
| Extension buttons | A button in the mapper's right-side pop-out panel | `ExtensionButtons.AddButton(...)` — see [plugin-api.md](references/plugin-api.md) |
| Requirement checks | Add your mod or feature to a map's `_requirements` / `_suggestions` | `RequirementCheck` — see [plugin-api.md](references/plugin-api.md) |

## 6. Failure modes

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Plugin not in the list | Wrong folder, restricted or non-ASCII path, unreadable DLL | Verify `<CM>\Plugins`, move to a writable ASCII path, check the log |
| "Incompatible plugin X" | Non-public type, no public parameterless constructor, duplicate callback attribute, missing dependency | Fix the type or remove the plugin |
| Plugin listed but feature absent | Built for another ChroMapper build; Harmony target renamed | Rebuild against the running build; re-check the target method |
| Several plugins stop loading after adding one | A DLL threw during the scan; the loader does not isolate failures | Move DLLs out in halves to find the bad one |
| Exception attributed to a plugin | Plugin code threw | Update or remove the plugin; report with the log |
| ChroMapper will not start | A plugin fails hard during load | Remove the newest plugin, then bisect |

## 7. Build and release assets

- [Plugin.cs.txt](assets/Plugin.cs.txt) — `[Plugin]` entry point with Harmony, a scene hook, and safe teardown.
- [ChroMapperPlugin.csproj.txt](assets/ChroMapperPlugin.csproj.txt) — `net48` class library using `$(ChroMapperDir)` and post-build deploy.
- [HarmonyPatch.cs.txt](assets/HarmonyPatch.cs.txt) — minimal patch class.
- [manifest.json.txt](assets/manifest.json.txt) — optional embedded manifest for ChroMapper-UpdateChecker.

## 8. Sources

- Plugin guide: <https://github.com/Caeden117/ChroMapper/blob/master/PLUGINS.md>
- Loader source: <https://github.com/Caeden117/ChroMapper/tree/master/Assets/__Scripts/PluginLoader>
- Current API surface: <https://github.com/Caeden117/ChroMapper/tree/master/Assets/__Scripts>
- Plugin settings page: <https://chromapper.atlassian.net/wiki/spaces/UG/pages/2916361/Settings+-+Plugins>
- FAQ (plugin paths, CM-JS): <https://chromapper.atlassian.net/wiki/spaces/UG/pages/806682666>
- Build guide: <https://github.com/Caeden117/ChroMapper/blob/master/BUILD.md>
- Community template: <https://github.com/Vainstains/ChroMapperPluginTemplate>
- Visual Studio template (Japanese docs): <https://github.com/rynan4818/ChroMapperPluginTemplates>
- Example plugin (Harmony and scenes): <https://github.com/rynan4818/ChroMapper-PrecisionStepAdditions>
- Full source index: [docs/wiki-map.md](../../docs/wiki-map.md)
