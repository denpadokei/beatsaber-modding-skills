---
name: beatsaber-quest-modding
description: End-to-end Beat Saber Quest standalone modding for Quest 1/2/3/3S/Pro. Use when installing, downgrading, or troubleshooting Quest mods (ModsBeforeFriday, QuestPatcher, ADB), or when developing C++ native mods with QPM, beatsaber-hook, custom-types, config-utils, BSML, and QMOD packaging. Triggers on QMOD, qpm.json, mod.template.json, MAKE_HOOK_MATCH, beatsaber-hook, bs-cordl, il2cpp, adb, and tombstone.
license: MIT
metadata:
  version: "1.0.0"
  platform: "Quest standalone (Android/il2cpp)"
  canonical_source: "https://bsmg.wiki/quest-modding.html"
---

# Beat Saber Quest Modding

Quest standalone runs an Android/il2cpp build of Beat Saber. Mods are native `.so` libraries loaded by Scotland2, built with C++ and the Android NDK, packaged as `.qmod`. This shares no workflow with PC. If the user has a PC headset (Rift, Index, Vive, or Quest via Link), use `beatsaber-pc-modding` instead.

## 1. Decide the job

| User intent | Go to |
| --- | --- |
| "Install mods on Quest", "BMBF", "MBF", "QuestPatcher", "downgrade" | [Install and downgrade](references/install-and-downgrade.md) |
| "Set up QPM / NDK", "create a Quest mod" | [Environment setup](references/environment-setup.md) |
| "Explain qpm.json / scripts / build layout" | [Project structure](references/project-structure.md) |
| "Hook a game method", "MAKE_HOOK_MATCH", "INSTALL_HOOK" | [Hooking](references/hooking.md) |
| "Add config", "config-utils" | [Configuration](references/config.md) |
| "Create a MonoBehaviour in C++", "custom-types" | [Custom types](references/custom-types.md) |
| "Add a settings page", "BSML on Quest" | [BSML UI](references/bsml-ui.md) |
| "Build and copy", "logcat", "crash", "tombstone" | [Build, test, debug](references/build-test-debug.md) |
| "Make a QMOD", "cover image", "publish" | [Packaging and release](references/packaging-release.md) |

## 2. Non-negotiables

1. **Confirm the platform first.** Quest standalone ≠ Quest via Link. The wrong guide wastes hours.
2. **Modding disables official multiplayer and base-game leaderboards.** `Beat Together` + `MultiplayerCore` restore modded multiplayer; `ScoreSaber`/`BeatLeader` provide custom leaderboards.
3. **Multiple accounts on the headset prevent modding.** Remove secondary accounts first.
4. **Latest game version may not be moddable.** Check `#modding-announcements`; downgrade before patching if needed.
5. **BMBF is deprecated and QAVS cannot patch right now.** Use ModsBeforeFriday (MBF); QuestPatcher only if the installed version is already moddable, because it cannot downgrade.
6. **Quest 1 needs MBF** with a special compatibility patch, even though it can reach 1.40.8.
7. **Never guess il2cpp signatures.** Inspect `extern/includes/codegen` (or a PC decompile of the same version). A wrong hook crashes the game on install.
8. **Initialize before use.** `il2cpp_functions::Init()` before hooks/custom types, `getModConfig().Init(modInfo)` before reading config, `BSML::Init()` before registering UI.
9. **Test with a QMOD build**, not only `copy.ps1`, before releasing.

## 3. Install / downgrade fast path

1. Enable Developer Mode on the Meta account bound to the headset (requires 2FA and an organization).
2. Back up `AvatarData.dat`, `PlayerData.dat`, `settings.cfg` if the user has progress worth keeping.
3. Use **MBF** at <https://mbf.bsquest.xyz> from a PC/Mac browser (or the Android workflow). It downgrades and patches in one flow.
4. Alternatively, **QuestPatcher** for offline management — but only on an already moddable version.
5. Install mods from <https://mods.bsquest.xyz> (BSQMods) or in MBF's mod list.

Full steps, including save backup and the dev-mode walkthrough: [install-and-downgrade.md](references/install-and-downgrade.md).

## 4. Develop: the loop

```text
verify game version → install NDK/QPM → template → update deps → qpm restore → code → qpm s build → qpm s copy/logcat → qpm s qmod
```

1. **Environment.** PowerShell Core (not Windows PowerShell 5), CMake 3.22+, QPM, Ninja, the Android NDK required by your `beatsaber-hook` version (the wiki currently documents 27), ADB. Details: [environment-setup.md](references/environment-setup.md).
2. **Create.** `qpm templatr --git https://github.com/Lauriethefish/quest-mod-template.git <dir>`.
3. **Pin dependencies.** Update `beatsaber-hook` and `bs-cordl` to versions matching the target game version, then `qpm restore`.
4. **Code.** `setup()` reports mod info and loads config; `late_load()` runs `il2cpp_functions::Init()` then installs hooks.
5. **Iterate.** `qpm s build`, then `qpm s copy -log -self -file latest.log` to push `lib<id>.so` and restart the game.
6. **Debug crashes.** `qpm s tomb`, `qpm s stack`, `qpm s logcat`.
7. **Package.** `qpm s qmod`, then test the `.qmod` through MBF/QuestPatcher before publishing.

### Minimal `main.cpp`

```cpp
#include "main.hpp"
#include "scotland2/shared/modloader.h"

static modloader::ModInfo modInfo{MOD_ID, VERSION, 0};

Configuration& getConfig() {
    static Configuration config(modInfo);
    return config;
}

MOD_EXTERN_FUNC void setup(CModInfo* info) noexcept {
    *info = modInfo.to_c();
    getConfig().Load();
    Paper::Logger::RegisterFileContextId(PaperLogger.tag);
    PaperLogger.info("Completed setup!");
}

MOD_EXTERN_FUNC void late_load() noexcept {
    il2cpp_functions::Init();
    PaperLogger.info("Installing hooks...");
    // INSTALL_HOOK(PaperLogger, MyHook);
    PaperLogger.info("Installed all hooks!");
}
```

Full template including config, custom types, and BSML: [`assets/main.cpp.txt`](assets/main.cpp.txt), [`assets/qpm.json.txt`](assets/qpm.json.txt), [`assets/mod.template.json.txt`](assets/mod.template.json.txt).

### Hook at a glance

```cpp
MAKE_HOOK_MATCH(LevelUIHook,
    &GlobalNamespace::StandardLevelDetailViewController::DidActivate, void,
    GlobalNamespace::StandardLevelDetailViewController* self,
    bool firstActivation, bool addedToHierarchy, bool screenSystemEnabling) {

    LevelUIHook(self, firstActivation, addedToHierarchy, screenSystemEnabling);
    PaperLogger.info("Level UI activated");
}

// late_load(): INSTALL_HOOK(PaperLogger, LevelUIHook);
```

Details, constructor/static hooks, and crash causes: [hooking.md](references/hooking.md).

### Config at a glance

```cpp
DECLARE_CONFIG(ModConfig,
    CONFIG_VALUE(Enabled, bool, "Enabled", true);
)

// late_load(): getModConfig().Init(modInfo);
// read: getModConfig().Enabled.GetValue()
// write: getModConfig().Enabled.SetValue(false)  → saves immediately
```

Full type list and file locations: [config.md](references/config.md).

## 5. Version matrix

Verify before relying on these. Current at time of writing (2026-11); game-version-specific numbers come from the wiki and QPM, not from this table.

| Component | Known good | Where to check |
| --- | --- | --- |
| Beat Saber (Quest) | Check `#modding-announcements` | <https://bsmg.wiki/quest-modding.html> |
| QPM CLI | 1.5.12 | <https://github.com/QuestPackageManager/QPM.CLI/releases> |
| beatsaber-hook | 9.4.3 | <https://github.com/QuestPackageManager/beatsaber-hook/releases> |
| bs-cordl | Must match game version, e.g. `^3500.0.0` for 1.35.0 | `qpm dependency add bs-cordl` |
| Android NDK | Use the version required by `beatsaber-hook`; `qpm ndk pin <version>` | `qpm ndk` |
| PowerShell | 7+ (pwsh) | <https://github.com/PowerShell/PowerShell/releases> |
| CMake | 3.22+ | <https://cmake.org/download/> |
| Ninja | `qpm download ninja` | QPM |
| Mod repository | BSQMods | <https://mods.bsquest.xyz> |

## 6. Failure modes

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `qpm` or `pwsh` not found | Wrong shell, PATH not set | Use PowerShell 7, add tools to PATH, reopen the terminal |
| `ANDROID_NDK_HOME` missing | NDK not installed or not exported | `qpm ndk download 27`, set the variable, or `qpm ndk pin 27` |
| Build fails on missing headers | Dependencies not restored or wrong versions | `qpm restore`; align `beatsaber-hook`/`bs-cordl` with the game version |
| Game crashes at startup after install | Hook signature mismatch, missing `il2cpp_functions::Init()`, config read before `Init` | Pull tombstone, symbolicate, fix the first frame in the trace |
| Mod loads but hook never fires | Wrong method/overload, hook installed before il2cpp init, codegen version mismatch | Verify signature in codegen, install in `late_load()` |
| `copy.ps1` cannot find the device | ADB not authorized or multiple devices | `adb devices`, accept the prompt in the headset |
| Mod not visible in MBF | Invalid QMOD, missing `mod.json`, bad `packageVersion` | Run `qpm s validate`, inspect the QMOD contents |
| UI missing | BSML registered before `BSML::Init()` or wrong register function signature | Init first, use the documented registration API |

## 7. References

- [Install and downgrade](references/install-and-downgrade.md) — dev mode, MBF, QuestPatcher, QAVS caveats, save backup, mod sources.
- [Environment setup](references/environment-setup.md) — PowerShell 7, CMake, QPM, Ninja, NDK, template, dependency pinning, IDE.
- [Project structure](references/project-structure.md) — `qpm.json`, `mod.template.json`, CMake, scripts, build outputs.
- [Hooking](references/hooking.md) — `MAKE_HOOK_MATCH`, `INSTALL_HOOK`, constructors, statics, hook order, codegen.
- [Configuration](references/config.md) — `config-utils` types, init timing, read/write, file location.
- [Custom types](references/custom-types.md) — `DECLARE_CLASS_CODEGEN`, `DEFINE_TYPE`, overrides, interfaces, constructors, coroutines.
- [BSML UI](references/bsml-ui.md) — registration points, BSML-Lite, `DidActivate`, XML views.
- [Build, test, debug](references/build-test-debug.md) — scripts, ADB, logcat, tombstones, `ndk-stack`, test matrix.
- [Packaging and release](references/packaging-release.md) — QMOD contents, cover image, file copies, publishing.

## 8. Source and scope

Derived from the [BSMG Wiki](https://bsmg.wiki/), MIT licensed. Canonical pages: [Quest modding](https://bsmg.wiki/quest-modding.html), [Quest mod development](https://bsmg.wiki/modding/quest/intro.html), [Quest support](https://bsmg.wiki/support/). If a step here disagrees with the live wiki, the wiki wins — modding tools change frequently.

## 9. Related areas

- Mapping and lighting: <https://bsmg.wiki/mapping/>
- Custom sabers, walls, and bloqs (Qosmetics): <https://discord.gg/qosmetics>
- Full wiki index: [docs/wiki-map.md](../../docs/wiki-map.md)
