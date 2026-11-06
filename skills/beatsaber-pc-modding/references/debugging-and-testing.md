# PC: Debugging and Testing

Canonical pages: <https://bsmg.wiki/modding/pc/testing.html>, <https://bsmg.wiki/modding/pc/decompiling.html>, <https://bsmg.wiki/modding/pc/rue.html>

## Launch arguments

Set these in Steam → Properties → General → Launch Options, or in BSManager's `Advanced launch`.

| Argument | Effect |
| --- | --- |
| `--verbose` | Opens the IPA console window. Required for development. |
| `--debug` | Shows debug-level logs in the console. |
| `--trace` | Shows trace-level logs. Very noisy. |
| `fpfc` | First Person Flying Controller: WASD + mouse, no headset. |
| `--auto_play` | Base-game auto player for testing maps without playing (1.37.1+). |
| `-vrmode oculus` | Skip SteamVR on 1.29.1 and older only. |

Start with `--verbose`, add `--debug` while diagnosing, and use `--trace` only for short targeted sessions.

## Reading logs

- Console window: live IPA output, including plugin load order and exceptions.
- Files: `Beat Saber/Logs/`.
- Startup banner shows the Unity version, game version, and loaded plugins. Confirm the game version there before debugging a load failure.

Typical lines:

```log
[INFO @ 00:00:00 | IPA] Running on Unity 2022.3.33f1
[INFO @ 00:00:00 | IPA] Game version 1.40.4
[INFO @ 00:00:00 | IPA] Loading plugins from Plugins and found 3
```

If your plugin is not in the loaded list, the problem is packaging, manifest, or version compatibility — not your code.

## Decompiling

### ILSpy

1. Open ILSpy.
2. `Manage Assembly Lists` → create a list named after the game version.
3. Open every DLL in `Beat Saber_Data\Managed` into the list. This resolves .NET and Unity references.
4. Search for the type.
5. Use `Ctrl+R` / right-click → `Analyze` on a member to find callers and callees.

### dnSpy

Same idea, plus a debugger and assembly editor. `File` → `Open List...` → add `Managed` DLLs → `Search Assemblies`.

### IDE decompilers

Rider and Visual Studio can decompile a referenced type on demand, but they do not give a browsable assembly list. Use them for quick signature checks; use ILSpy/dnSpy for discovery.

## Runtime inspection

- **Runtime Unity Editor (RUE)** — inspect GameObjects, components, and live values in-game. Install manually; open with `G` in FPFC. Rebind in `UserData/Runtime Unity Editor (BSIPA).json` because `G` also toggles SiraUtil FPFC.
- **UnityExplorer** — alternative inspector; requires a BSIPA-compatible build.

Use an inspector to learn the real object hierarchy and component types, then search those names in the decompiler.

## Debug Unity build

Release Unity players strip checks and can hard-crash without a managed stack trace. Mods that touch threading, native memory, or Unity objects should be tested on a development player.

1. Find the Unity version from the IPA banner.
2. Install that exact version via Unity Hub (or the Unity download archive).
3. Open the install folder → `Data\PlaybackEngines\windowsstandalonesupport\Variations\win64_player_development_mono`.
4. Copy `UnityCrashHandler`, `UnityPlayer`, `WindowsPlayer`, and `WinPixEventRuntime` into the Beat Saber folder.
5. Rename or move `Beat Saber.exe`, then rename `WindowsPlayer.exe` to `Beat Saber.exe`.
6. Launch. A `Development Build` marker appears at the bottom right in FPFC, and Unity errors show an on-screen console.

Keep backups of the original files so you can switch back. A batch script that swaps `.bak` copies in and out avoids repeating the manual steps. BeatMods reviews use a debug build; unhandled Unity exceptions are grounds for rejection.

## Test matrix

| Area | What to test |
| --- | --- |
| Modes | Solo, Campaign, Party, Online, Tutorial — objects differ per mode |
| Lifecycle | Menu load, map start, pause, resume, fail, quit to menu |
| Restart | Settings → OK performs an internal restart; verifies no stale references |
| Scene changes | Enter and leave gameplay repeatedly; check for duplicate handlers |
| Mod coexistence | Test with common public mods installed |
| Performance | Check frame time with the mod idle and active; remove per-frame allocations |
| Input | Keyboard/mouse (FPFC) and VR controllers where relevant |
| Persistence | Restart the game and confirm config values survive |

## Crash triage flow

1. Reproduce with only core mods + the suspect mod.
2. Capture the log and the last action before the crash.
3. Check whether the crash is a managed exception (log has a stack trace) or a native/Unity crash (no trace).
4. Managed: read the top frame, fix the null/argument, re-test.
5. Native: switch to the debug Unity player, reproduce, and read the Unity console.
6. If it only happens with another mod, test load order (`LoadAfter`/`LoadBefore`) and check for patched-method conflicts.

## Verifying a build quickly

```powershell
# Confirm the DLL landed in the right instance
Get-ChildItem "C:\Users\$env:USERNAME\BSManager\BSInstances" -Recurse -Filter MyMod.dll |
    Select-Object FullName, Length, LastWriteTime
```

There is no supported way to read the embedded manifest from PowerShell. Launch with `--verbose` and confirm the plugin name/version in the console instead.

## Common exceptions

| Exception | Common cause |
| --- | --- |
| `ArgumentException` | Bad path, bad enum, duplicate key |
| `ArgumentNullException` | Missing dependency or a component that does not exist in this mode |
| `DirectoryNotFoundException` | Hard-coded path or missing mod data folder |
| `IOException` | File locked by another process or bad permissions |
| `TypeLoadException` / `MissingMethodException` | Assembly built against a different game/dependency version |
| `NullReferenceException` | Object destroyed, wrong scene, or component not found |

See also <https://bsmg.wiki/support/exceptions.html>.
