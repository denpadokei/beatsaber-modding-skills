# PC: Install, Update, and Downgrade Mods

Canonical pages: <https://bsmg.wiki/pc-modding.html>, <https://bsmg.wiki/support/>

## Requirements

- Own Beat Saber on Steam or Oculus PC. Cross-buy from Quest gives you the Oculus PC copy.
- Run the game at least once before modding, including after a reinstall.
- The latest game version may not be moddable. Check `#modding-announcements` in the BSMG Discord before troubleshooting.

## Safe practice

- Beat Saber **never** requests Administrator. A UAC prompt after installing a mod means the mod is malicious. Do not accept; report it.
- Unverified mods from Discord channels carry risk. Prefer BeatMods through an installer.
- Avoid video tutorials; they are frequently outdated. The wiki is canonical.
- Back up `Beat Saber_Data\CustomLevels` periodically. Updates can reset it.

## Installers

| Tool | Status | Notes |
| --- | --- | --- |
| [BSManager](https://bsmanager.io) | **Recommended** | Manages versions, mods, maps, and playlists. Can downgrade. Supports OneClick map installs. |
| [BeatSaberModManager](https://github.com/affederaffe/BeatSaberModManager/releases/latest) | Supported | Windows and Linux, BeatMods-backed. |
| [ModAssistant](https://github.com/bsmg/ModAssistant/releases/latest) | Legacy | No longer recommended; known bugs. |

All of them install BSIPA and mods into a selected game instance. BSManager is also the cleanest way to keep a separate modded instance per game version.

## Install folders

| Source | Default path |
| --- | --- |
| Steam | `C:\Program Files (x86)\Steam\steamapps\common\Beat Saber\` |
| Oculus | `C:\Program Files\Oculus\Software\Software\hyperbolic-magnetism-beat-saber\` |
| BSManager | `C:\Users\<user>\BSManager\BSInstances\` |
| Steam (other drive) | `F:\SteamLibrary\steamapps\common\Beat Saber\` |
| Oculus (other drive) | `F:\Oculus\Software\Software\hyperbolic-magnetism-beat-saber\` |

The relevant subfolders are `Plugins` (mod DLLs), `Beat Saber_Data\Managed` (game assemblies), `Beat Saber_Data\CustomLevels` (songs), and `Playlists`.

## Manual installation

Only needed for mods that are not in an installer. A patched game already has BSIPA.

1. Run the game once.
2. Download BSIPA matching the game version from <https://github.com/bsmg/BeatSaber-IPA-Reloaded/releases>.
3. Extract its contents into the install folder so `IPA.exe`, `Libs`, and `winhttp.dll` sit next to `Beat Saber.exe`.
4. Run `IPA.exe` once to patch. The folder should now contain `IPA.exe`, `Libs`, `Plugins`, and the patched executable state.
5. Drop mod zips into the install folder, preserving their internal structure, or copy DLLs into `Plugins`. Install dependencies too.
6. Launch with `--verbose` to confirm plugins load.

If step 4 reports errors, BSIPA was not extracted to the correct level.

## Downgrading

### BSManager (Steam and Oculus)

Install the target version as a separate instance and mod that instance. This is the least destructive option and keeps the current install intact.

### Legacy branches (Steam)

1. Uninstall BSIPA in the installer. On 1.30+, uninstall all mods instead.
2. Steam → right-click Beat Saber → Properties → Betas.
3. Select `legacy1.40.8_unity_v2021.3.16f1`, `legacy1.37.1_unity_v2021.3.16f1`, `1.34.2_legacy`, or `legacy1.29.1_unity_ver2019.4.28f1`.
4. Let the download finish, run the game once, then re-mod.

### Legacy branches (Oculus)

1. Uninstall BSIPA (or all mods on 1.30+).
2. Open the Beat Saber store page → `Versions + Release Notes` → click `(LIVE)` next to the version.
3. Select the legacy branch, let it download, run the game once, then re-mod.

### OculusDowngrader

Alternative for Oculus installs: <https://computerelite.github.io/tools/Oculus/OculusDowngraderGuide.html>.

## Songs and playlists

- **In-game downloader:** `BetterSongSearch` (button may read `BETTERSONGSEARCH`) or `BeatSaverDownloader` (`MORE SONGS`) under the `MODS` menu.
- **Manual:** unzip a map so the folder contains `Info.dat`, `song.ogg`, and difficulty files, then place it in `Beat Saber_Data\CustomLevels`. One folder per map.
- **OneClick:** enable it in BSManager; clicking a BeatSaver map installs it directly.
- **Playlists:** install `PlaylistManager`, then either use BSManager's Maps tab or place `.bplist` files in `Beat Saber/Playlists` and hit download-all in-game.
- **SongCore** is strongly recommended even for vanilla custom songs: faster loading and the foundation for downloaders, leaderboards, and playlists.

## Uninstalling mods

- Installer-managed: select the version in BSManager → `Mods` tab → trash icon.
- Manual: delete the DLL from `Plugins`. Remove leftover config files from `UserData` if the mod stores them there.
- To fully un-mod: verify the game files to restore replaced binaries, then delete `Plugins`, `Libs`, `IPA.exe`, `winhttp.dll`, and any leftover `UserData` entries. A clean reinstall is simpler if the install is heavily modified.

## When a game update breaks mods

1. Do not reinstall mods immediately. Wait for BSIPA and core mods to publish builds for the new version.
2. Check `#modding-announcements`.
3. If the user needs to play now, downgrade to the last moddable version and mod that instance.
4. Never copy old `Plugins` into a new version and expect stability.

## Support triage

1. Get the IPA log (`--verbose`) and the game version.
2. Confirm the mod list matches that version.
3. Test with only core mods (BSIPA + SongCore + the mod under investigation).
4. Verify game files, then do a clean install if the managed folder is polluted.
5. Check <https://bsmg.wiki/support/> for the specific symptom before guessing.
