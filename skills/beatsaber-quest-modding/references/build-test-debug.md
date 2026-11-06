# Quest: Build, Test, Debug

Canonical page: <https://bsmg.wiki/modding/quest/intro.html#testing-your-mod>

## Build and deploy

```powershell
qpm s build                 # compile only
qpm s copy                  # build, push to headset, restart the game
qpm s copy -log -self -file latest.log
qpm s restart               # restart without rebuilding
qpm s qmod                  # build an installable .qmod
```

`copy.ps1` pushes `build/lib<id>.so` to the modloader directory on the headset and restarts Beat Saber. Requires an authorized ADB device.

### ADB basics

```powershell
adb devices                 # must show "device", not "unauthorized"
adb shell                   # shell on the headset
adb logcat -c               # clear logs
adb logcat -s Unity         # Unity-tagged logs
adb pull /sdcard/Android/data/com.beatgames.beatsaber/files/tombstone_01 .
```

Put the headset on and accept the USB debugging prompt the first time. Close SideQuest if it holds the ADB connection.

## Logging

```powershell
qpm s logcat                # all Beat Saber output
qpm s logcat -self          # only your mod
qpm s logcat -self -file latest.log
```

Recommendations:

- `-self` makes your own hook output readable.
- Clear the buffer (`adb logcat -c`) before reproducing an issue so the trace is short.
- Do not log per frame in a build you intend to publish.
- If the game dies too fast to read the console, reproduce while `qpm s logcat -file crash.log` is running.

## Native crash triage

Beat Saber writes native crash tombstones on the device.

```powershell
qpm s tomb                  # pull the newest tombstone
qpm s tomb -analyze         # map frames to source when the build matches
qpm s stack                 # symbolicate
```

Tombstone location:

```text
/sdcard/Android/data/com.beatgames.beatsaber/files/tombstone_01
/sdcard/Android/data/com.beatgames.beatsaber/files/tombstone_02
...
```

The newest file has the highest suffix. `-analyze` only gives useful source lines when the deployed `.so` matches the local build exactly.

Reading a tombstone:

1. Find the first frame inside your mod (`lib<id>.so`), not the deepest framework frame.
2. Symbolicate with `ndk-stack` and the matching unstripped library.
3. If the crash is in a hook, the signature is usually wrong or a pointer is null.
4. If the crash is at load, check `AutoRegister`, static initialization order, and dependency versions.

## Test matrix

| Area | What to check |
| --- | --- |
| Boot | Game reaches the main menu with the mod installed |
| Menu | Registered tabs/pages open, close, and reopen without duplication |
| Config | Values load, change, persist across a game restart |
| Gameplay | Hook behavior in Solo, Party, Campaign, and multiplayer if applicable |
| Scene changes | Enter/leave a map repeatedly; no stale pointers or duplicate coroutines |
| Multiple activations | Close and reopen menus; components rebuild correctly |
| Device | Test on the actual headset, not a flat preview |
| Packaging | Install the `.qmod` through MBF/QuestPatcher and boot |

## Common failures

| Symptom | Diagnose with | Likely fix |
| --- | --- | --- |
| Black screen then crash to home | tombstone | Hook signature, missing init, or bad dependency version |
| Game boots but mod log lines never appear | logcat, `Modloader` folder | Wrong `.so` name, mod not copied, Scotland2 not initialized |
| Hook fires but values are wrong | logcat + codegen | Wrong field or wrong overload |
| Crash only after opening a menu | logcat | UI built outside `firstActivation`, stale component pointer |
| Crash only after a restart | logcat | Custom type or coroutine not cleaned up |
| `adb: device unauthorized` | `adb devices` | Accept the prompt in the headset, reinstall ADB drivers |
| QMOD installs but does not load | `qpm s validate`, QMOD contents | `mod.json` mismatch, wrong `packageVersion`, missing mod file |

## Clean rebuild

```powershell
Remove-Item -Recurse -Force build
qpm restore
qpm s build
```

Delete `extern/` only if you suspect a corrupted restore; then `qpm restore` again.

## Pre-release test pass

1. Fresh install of the `.qmod` through MBF.
2. Boot to menu, open every UI page.
3. Play one map with the feature enabled and one with it disabled.
4. Change every config value, restart the game, verify persistence.
5. Uninstall and reinstall the mod; verify no stale config breaks it.
6. Check the log for warnings from your mod during the whole pass.
