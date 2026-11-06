# Quest: Packaging and Release

Canonical page: <https://bsmg.wiki/modding/quest/intro.html#utilizing-mod-template-json> · QMOD schema: <https://github.com/Lauriethefish/QuestPatcher.QMod>

## Build the QMOD

```powershell
qpm s validate      # generate mod.json and validate against the schema
qpm s qmod          # build + package
```

Output: `./<ModName>.qmod`, a zip archive.

```text
MyQuestMod.qmod
├── mod.json
├── libmyquestmod.so
├── cover.png
└── <extra files from fileCopies>
```

## `mod.json`

Generated from `mod.template.json`; never edit it by hand.

```json
{
  "_QPVersion": "0.1.1",
  "name": "My Quest Mod",
  "id": "myquestmod",
  "author": "YourName",
  "version": "1.0.0",
  "packageId": "com.beatgames.beatsaber",
  "packageVersion": "1.35.0_8016709773",
  "description": "What the mod does.",
  "dependencies": [],
  "modFiles": ["libmyquestmod.so"],
  "libraryFiles": [],
  "coverImage": "cover.png",
  "fileCopies": []
}
```

| Field | Rule |
| --- | --- |
| `id` | Stable, unique, matches `qpm.json` `info.id` |
| `version` | SemVer |
| `packageVersion` | Must match the target Beat Saber build |
| `dependencies` | Ids + version ranges of required mods |
| `modFiles` | Leave `${binary}` in the template; QPM resolves it |
| `libraryFiles` | Shared `.so` files your mod needs at runtime |
| `coverImage` | 1024×512, PNG/JPG/GIF, under 2 MB |

## Cover image

1. Create `cover.png` in the project root (1024×512).
2. Add `"coverImage": "cover.png"` to `mod.template.json`.
3. Rebuild the QMOD and verify it appears in MBF/QuestPatcher.

Large or animated covers slow down mod browsing; keep it under 2 MB.

## Extra files

Use `fileCopies` to place data on the device:

```json
"fileCopies": [
  {
    "name": "presets.json",
    "destination": "/sdcard/ModData/com.beatgames.beatsaber/Mods/MyQuestMod/presets.json"
  }
]
```

Add the source file to the package list in `createqmod.ps1` as documented in the template, then rebuild. Use `ModData`, not the game's data folder, for mod-owned files.

## Dependencies and bundling

- Declare runtime mod dependencies in `mod.template.json` `dependencies`.
- Declare build-time QPM dependencies in `qpm.json`.
- Set `"additionalData": { "includeQmod": false }` for loaders/runtime libraries that the user installs separately (for example Scotland2).
- Never bundle another mod's `.so` as `libraryFiles` unless you are certain of the licensing and load behavior.

## Versioning

| Change | Version bump |
| --- | --- |
| Bug fix, no API change | Patch |
| New feature | Minor |
| Config/API break, or new game version only | Major |

Per game version, publish a distinct release and state the supported `packageVersion`. Do not advertise a version range you have not tested.

## Test the package before publishing

1. Uninstall the development copy.
2. Install the `.qmod` through MBF or QuestPatcher.
3. Boot, open every UI page, play a map, change config, restart.
4. Verify the mod appears in the mod list with the right name, version, author, and cover.
5. Check the log for warnings or repeated errors.

`qpm s copy` tests the `.so`, not the package. A mod can work via `copy.ps1` and fail as a QMOD because `mod.json` is wrong.

## Distribution

| Channel | Use |
| --- | --- |
| GitHub Releases | Primary download; attach the `.qmod` and release notes |
| BSQMods (<https://mods.bsquest.xyz>) | Quest mod repository used by MBF; follow its submission instructions |
| BSMG Discord `#quest-mod-dev` / mod channels | Announcements and feedback; not a substitute for a repository listing |

Release notes should include:

- Supported Beat Saber version (`packageVersion`).
- Required dependencies and versions.
- What changed.
- Known incompatibilities.
- Whether saves/config need migration.

## CI

The template includes `.github/workflows/build-ndk.yml`, which builds with the Android NDK runner. Adapt it to:

1. Restore QPM dependencies.
2. Build.
3. Run `qpm s validate`.
4. Upload the `.qmod` as an artifact on tags.

Pin the NDK version in CI to match local development; a mismatched NDK produces different crash behavior.

## Release checklist

- [ ] Mod ID and name are stable and match across `qpm.json`, `mod.template.json`, and logs.
- [ ] `packageVersion` matches the tested game build.
- [ ] Dependencies declared and version-checked.
- [ ] `qpm s validate` passes.
- [ ] QMOD installs cleanly on a fresh device state.
- [ ] Menu, gameplay, config persistence, and restart tested.
- [ ] Cover image present and under 2 MB.
- [ ] No debug logging every frame.
- [ ] README documents install, requirements, configuration, and known issues.
- [ ] Release notes list the supported game version.

## Uninstall behavior

Users remove the mod through MBF/QuestPatcher. Leave no state that breaks the game if the `.so` disappears:

- Config files under `ModData` can remain.
- Do not patch game files on disk.
- Do not leave scheduled coroutines or persistent GameObjects that assume the mod is present.
