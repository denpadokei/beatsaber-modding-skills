---
name: beatsaber-pc-modding
description: End-to-end Beat Saber PC modding. Use when installing, updating, or downgrading PC mods (Steam/Oculus/BSManager), or when developing C# mods with BSIPA, Harmony patches, BSML UI, and SiraUtil/Zenject. Triggers on BSIPA, BeatMods, BSML, HarmonyPatch, SiraUtil, Zenjector, Plugin.cs, Directory.Build.props, and vague requests about a Beat Saber mod.
license: MIT
metadata:
  version: "1.0.0"
  platform: "PC (Steam / Oculus / BSManager)"
  canonical_source: "https://bsmg.wiki/pc-modding.html"
---

# Beat Saber PC Modding

Covers both jobs people call "modding": **using** mods and **building** mods. Identify which one before doing anything else. If the target is Quest standalone, stop and use `beatsaber-quest-modding` instead — the workflows share nothing.

## 1. Decide the job

| User intent | Go to |
| --- | --- |
| "Install mods", "songs won't load", "update broke my mods", "downgrade" | [Install and downgrade](references/install-and-downgrade.md) |
| "Create a mod", "build a plugin", "set up a project" | [Project setup](references/project-setup.md) |
| "Patch a game method", "prefix/postfix", "transpiler" | [Harmony patching](references/harmony-patching.md) |
| "Add a settings menu", "BSML", "flow coordinator", "floating screen" | [BSML UI](references/bsml-ui.md) |
| "Inject a service", "Zenject", "SiraUtil", "installer" | [Zenject and SiraUtil](references/zenject-sirautil.md) |
| "Crashes", "logs", "decompile", "test in game" | [Debugging and testing](references/debugging-and-testing.md) |
| "Release", "BeatMods", "manifest", "support a user" | [Release and support](references/release-and-support.md) |

## 2. Non-negotiables

1. **Version is everything.** A PC mod is compiled against one game version. Never mix assemblies from different versions, never assume a mod works after a game update, and always confirm the target version first.
2. **Run the vanilla game once before modding.** Installers and BSIPA both depend on a generated install state.
3. **Beat Saber never asks for Administrator.** If a mod triggers UAC, stop — it is malicious.
4. **Do not publicize another mod's assembly.** Use reflection for other mods; publicizing their assembly can break the mod loader.
5. **Test with a debug Unity build** when the mod touches gameplay, threading, or Unity objects. BeatMods reviewers do this, and Unity exceptions are grounds for rejection.
6. **Never invent game APIs.** Verify names in ILSpy/dnSpy or the wiki before writing a patch. Wrong signatures fail at runtime, not compile time, when using string-based patches.
7. **Back up `CustomLevels`** before version changes; game updates can reset it.

## 3. Install / downgrade fast path

1. Confirm ownership on Steam or Oculus PC. A Quest-only copy cannot run PC mods.
2. Install [BSManager](https://bsmanager.io) — the recommended installer/downgrader. `BeatSaberModManager` is the alternative; ModAssistant is legacy and no longer recommended.
3. Run the game once.
4. If the current version is not moddable, downgrade in BSManager, or use a Steam/Oculus legacy branch (`1.40.8`, `1.37.1`, `1.34.2`, `1.29.1`). Full steps: [install-and-downgrade.md](references/install-and-downgrade.md).
5. Install `SongCore` if the user wants custom songs; install the in-game downloader (`BetterSongSearch` or `BeatSaverDownloader`) if they want to browse maps in-game.

Install paths (default):

| Store | Path |
| --- | --- |
| Steam | `C:\Program Files (x86)\Steam\steamapps\common\Beat Saber\` |
| Oculus | `C:\Program Files\Oculus\Software\Software\hyperbolic-magnetism-beat-saber\` |
| BSManager | `C:\Users\<user>\BSManager\BSInstances\` |

## 4. Develop: the loop

```text
verify game version → create BSMT project → implement → build → launch with --verbose → read IPA console → repeat → release build
```

1. **Environment.** Windows, Beat Saber installed and modded, Rider (recommended) or Visual Studio, plus the BSMT extension. Full details: [project-setup.md](references/project-setup.md).
2. **Project.** `Custom Templates` → BSIPA plugin template. Set the Beat Saber directory when prompted. Build once before writing code to prove references resolve.
3. **Metadata.** Fill `Directory.Build.props`: `PluginId`, `PluginName`, `Authors`, `Version`, `GameVersion`, `Description`, and dependencies (`DependsOn`). Keep the BSIPA dependency.
4. **Investigate.** Decompile `Beat Saber_Data\Managed` in ILSpy (or dnSpy) and find the method, event, or pool you need. Prefer postfixes and public APIs over transpilers.
5. **Implement.** Use the smallest mechanism that works:
   - observe behavior → Harmony postfix
   - gate/replace behavior → Harmony prefix returning `false`
   - rewrite IL → transpiler (last resort)
   - persistent UI → BSML settings tab
   - new gameplay object → Zenject installer + pool
6. **Test.** Launch with `--verbose`, confirm the plugin loads, exercise the feature in every affected mode (Solo, Campaign, Party, Online, Tutorial), then do an internal restart (Settings → OK) to catch stale references.
7. **Release.** Build `Release`; BSMT emits a zip under `bin\Release\net472\zip\`. Validate the manifest and submit to BeatMods if desired.

### Plugin skeleton

```csharp
using IPA;
using IPA.Config;
using IPA.Config.Stores;
using IPA.Logging;

namespace MyMod;

[Plugin(RuntimeOptions.SingleStartInit), NoEnableDisable]
internal class Plugin
{
    internal static Logger Log { get; private set; } = null!;

    [Init]
    public Plugin(Logger logger, Config config)
    {
        Log = logger;
        PluginConfig.Instance = config.GenerateConfigObject<PluginConfig>();
    }

    [OnStart]
    public void OnApplicationStart() => Log.Info("MyMod started.");

    [OnExit]
    public void OnApplicationQuit() => Log.Info("MyMod stopped.");
}

internal class PluginConfig
{
    public static PluginConfig Instance { get; set; } = null!;

    public virtual bool Enabled { get; set; } = true;
}
```

Full template with Harmony, BSML, and SiraUtil wiring: [`assets/Plugin.cs.txt`](assets/Plugin.cs.txt).

### Harmony at a glance

```csharp
[HarmonyPatch(typeof(NoteController), nameof(NoteController.Init))]
internal class NoteInitPatch
{
    internal static void Postfix(NoteController __instance) =>
        Plugin.Log.Info($"{__instance.GetType().Name} initialized");
}
```

Register with `harmony.PatchAll(Assembly.GetExecutingAssembly())` and unpatch with `harmony.UnpatchSelf()`. Details, parameter table, private access, and pitfalls: [harmony-patching.md](references/harmony-patching.md).

### BSML at a glance

```csharp
[ViewDefinition("MyMod.UI.SettingsView.bsml")]
internal class SettingsView : BSMLAutomaticViewController
{
    [UIComponent("status")]
    private readonly TextMeshProUGUI status = null!;

    [UIAction("#post-parse")]
    public void PostParse() => status.text = "Ready";
}
```

Register a settings tab with `BSMLSettings.Instance.AddSettingsMenu(name, resource, host)`. Full menu, flow-coordinator, and floating-screen patterns: [bsml-ui.md](references/bsml-ui.md).

## 5. Version matrix

Verify before relying on these. They were current when this skill was written (2026-11) and are **not** a substitute for checking the wiki and release pages.

| Component | Known good | Where to check |
| --- | --- | --- |
| Beat Saber | Check `#modding-announcements` in BSMG Discord | [PC modding](https://bsmg.wiki/pc-modding.html) |
| Unity | 2022.3.x (per game build) | IPA log line `Running on Unity ...` |
| .NET Framework | 4.7.2 | BSMT template |
| BSIPA | 4.3.7 | [BSIPA releases](https://github.com/bsmg/BeatSaber-IPA-Reloaded/releases) |
| BSML | 1.14.2 | [BSML releases](https://github.com/monkeymanboy/BeatSaberMarkupLanguage/releases) |
| SiraUtil | 3.4.0 | [SiraUtil releases](https://github.com/Auros/SiraUtil/releases) |
| Harmony | Pulled in by BSIPA; do not vendor a second copy | BSIPA docs |

## 6. Failure modes

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Plugin never appears in IPA console | Wrong `Plugins` folder, missing `manifest.json`, or game version mismatch | Rebuild to the correct Beat Saber directory; check the console for load errors |
| `TypeLoadException` / `MissingMethodException` on startup | Compiled against a different game or dependency version | Match `GameVersion`, re-add references, rebuild |
| Harmony patch silently does nothing | Method name/signature mismatch or overload picked | Use `nameof`, specify argument types, verify in ILSpy |
| UI is blank or throws in BSML parse | `.bsml` not `EmbeddedResource`, wrong resource name, bad tag | Confirm build action and resource path; check log for parse error |
| Game hard-crashes without a managed exception | Unity release build stripped checks | Swap in the debug Unity player; see [debugging-and-testing.md](references/debugging-and-testing.md) |
| Mods break after a game update | BSIPA or dependencies not updated for the new version | Downgrade or wait for updates; never force-load old mods |
| User reports stutters after install | Mod count, logging level, or per-frame allocations | Test with only core mods; remove per-frame logging and allocations |

## 7. References

- [Install and downgrade](references/install-and-downgrade.md) — installers, manual BSIPA, legacy branches, songs, playlists, uninstall, safety.
- [Project setup](references/project-setup.md) — Rider/Visual Studio, BSMT, `Directory.Build.props`, references, build outputs.
- [Harmony patching](references/harmony-patching.md) — patch types, injected parameters, private access, ordering, pitfalls.
- [BSML UI](references/bsml-ui.md) — embedded resources, settings/gameplay tabs, flow coordinators, floating screens, bindings.
- [Zenject and SiraUtil](references/zenject-sirautil.md) — installers, locations, bindings, UI injection, Affinity.
- [Debugging and testing](references/debugging-and-testing.md) — launch args, IPA logs, decompilers, RUE, debug player, test matrix.
- [Release and support](references/release-and-support.md) — release checklist, BeatMods expectations, support triage.

## 8. Related areas

Not covered in depth here, but commonly adjacent to a code mod:

- Custom sabers, avatars, platforms, walls: <https://bsmg.wiki/models/>
- Mapping and lighting: <https://bsmg.wiki/mapping/>
- Ranking and PP: <https://bsmg.wiki/ranking-guide.html>
- Full wiki index: [docs/wiki-map.md](../../docs/wiki-map.md)

## 9. Source and scope

Derived from the [BSMG Wiki](https://bsmg.wiki/), MIT licensed. Canonical pages: [PC modding](https://bsmg.wiki/pc-modding.html), [Making PC mods](https://bsmg.wiki/modding/pc/), [Support](https://bsmg.wiki/support/). If a step here disagrees with the live wiki, the wiki wins — it is updated faster than any third-party guide.
