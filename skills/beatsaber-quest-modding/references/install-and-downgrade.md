# Quest: Install, Update, and Downgrade Mods

Canonical pages: <https://bsmg.wiki/quest-modding.html>, <https://bsmg.wiki/quest/modding-with-mbf.html>

## Before anything else

| Check | Why |
| --- | --- |
| Headset is Quest 1/2/3/3S/Pro standalone | Rift and Quest-via-Link use the PC workflow |
| Only one account on the headset | Multiple accounts block modding |
| Developer Mode is enabled | Required for ADB and patching |
| The user accepts the trade-offs | Modding disables official multiplayer and base-game leaderboards |
| Current game version is moddable | If not, downgrade during patching |

Custom leaderboards require `ScoreSaber` (<https://scoresaber.com/quest>) or `BeatLeader` (<https://beatleader.xyz>). Modded multiplayer requires `Beat Together` + `MultiplayerCore`, which may not be available on every version.

## Enable Developer Mode

1. Sign in at <https://developer.oculus.com/manage/organizations/create/> with the Meta account bound to the headset.
2. Enable 2FA; an organization cannot be created without it.
3. Create an organization (any name).
4. Open the Meta Quest phone app → headset settings → Developer Mode → enable.

## Back up save data

Modding normally preserves saves, but a backup is cheap:

1. Connect the headset to a PC.
2. In SideQuest (or any ADB file browser), open `sdcard/Android/data/com.beatgames.beatsaber/files`.
3. Copy `AvatarData.dat`, `PlayerData.dat`, and `settings.cfg` to the PC.

To restore, copy them back to the same path.

## ModsBeforeFriday (MBF)

MBF is the recommended tool. It runs in a Chromium browser (Edge/Chrome, **not** Firefox or Safari), downgrades to the latest moddable version, patches, and installs core mods.

1. Update the headset's Beat Saber to the current version (MBF downgrades as needed).
2. Open <https://lauriethefish.github.io/ModsBeforeFriday/> (mirror: <https://mbf.bsquest.xyz>).
3. Connect the headset by USB.
4. Click `Connect to Quest`, select the device, confirm the ADB prompt in the headset.
5. If prompted to downgrade, let MBF do it.
6. Click `Mod the app`. **Do not unplug during patching.**
7. After completion, use `Add Mods` to install additional mods from the built-in browser.

MBF installs a song downloader by default.

### Quest 1

Quest 1 can be patched to `1.40.8` only through MBF, because it needs a special compatibility patch. The last officially supported Quest 1 build is `1.37.101`. If MBF reports an unexpected version, make sure the headset is not on the legacy release channel:

1. Open the Beat Saber store page.
2. Sign in with the headset's account.
3. Find `Version + release notes`.
4. Select `LIVE`, reinstall Beat Saber, and retry.

## QuestPatcher

QuestPatcher is a desktop GUI for il2cpp Unity apps. It is useful when the connection is unstable or offline management is required.

- Download: <https://github.com/Lauriethefish/QuestPatcher/releases/latest>
- **It cannot downgrade Beat Saber.** Use it only when the installed version is already moddable.
- If it has been used before, run `Tools` → `Quick Fix` first.
- Select `Scotland2` as the mod loader when patching.
- Install core mods and extras from <https://mods.bsquest.xyz>.

## QAVS

QAVS cannot currently downgrade or patch Beat Saber correctly. Do not use it for patching; use MBF. Only follow <https://bsmg.wiki/quest/modding-with-qavs.html> if a knowledgeable source explicitly instructs it.

## BMBF

Deprecated and broken since the v63 update. It will not work. Do not attempt to mod with BMBF; migrate to MBF.

## Installing mods after patching

| Source | Use |
| --- | --- |
| MBF `Add Mods` | Easiest; resolves versions for the patched game |
| BSQMods <https://mods.bsquest.xyz> | Browse and download QMODs directly |
| QuestPatcher | Import a `.qmod` file manually |

QMODs are zip archives with a `mod.json` manifest. Side-loading a QMOD for the wrong game version can crash the game on boot.

## Updating the game

1. Do not accept a game update until the mods you need support it.
2. Back up saves.
3. Update, then patch again with MBF. MBF will downgrade if the new version is not moddable.
4. Reinstall mods for the new version; do not reuse old QMODs.

## Uninstalling mods

- MBF: remove mods from its mod list.
- QuestPatcher: select the mod and uninstall.
- Nuclear option: uninstall Beat Saber, reinstall, then patch again. Saves in `Android/data` are usually retained, but verify the backup first.

## Troubleshooting quick hits

| Symptom | Fix |
| --- | --- |
| MBF cannot see the headset | Use a data-capable USB cable, accept the ADB prompt, install/repair ADB drivers, close SideQuest |
| Browser unsupported | Use current Edge or Chrome |
| "Multiple accounts" error | Remove secondary accounts from the headset |
| Patched but no mods appear | Reopen MBF, verify the patch, install a core mod to test |
| Game crashes after adding a mod | Remove the last mod; check its game version |
| Official multiplayer unavailable | Expected; use Beat Together + MultiplayerCore |
