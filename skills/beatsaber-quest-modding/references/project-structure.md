# Quest: Project Structure

Canonical page: <https://bsmg.wiki/modding/quest/intro.html> · Template: <https://github.com/Lauriethefish/quest-mod-template>

## Layout after `qpm templatr`

```text
MyQuestMod/
├── cmake/                  # toolchain and target helpers (android-ndk, quest, qpm, strip)
├── extern/                 # restored dependencies (gitignored)
│   └── includes/
│       ├── codegen/        # generated game type headers (fallback "decompiler")
│       └── ...
├── include/
│   ├── main.hpp
│   └── _config.hpp
├── scripts/                # build, copy, qmod, logcat, tombstone, stack
├── shared/                 # optional public API for other mods
├── src/
│   └── main.cpp
├── .vscode/                # C++ properties, launch, tasks
├── CMakeLists.txt
├── mod.template.json
├── ndkpath.txt             # written by qpm ndk pin
├── qpm.json
└── README.md
```

`extern/` is the equivalent of `node_modules`: never commit it, never edit it.

`shared/` is only needed when publishing a dependency others consume (Qosmetics-style APIs). Leave it empty otherwise.

## `qpm.json`

```json
{
  "sharedDir": "shared",
  "dependenciesDir": "extern",
  "version": "0.1.0",
  "info": {
    "name": "MyQuestMod",
    "id": "myquestmod",
    "version": "0.1.0",
    "url": null,
    "additionalData": {
      "overrideSoName": "libmyquestmod.so",
      "cmake": true
    }
  },
  "workspace": {
    "scripts": {
      "build": ["pwsh ./scripts/build.ps1"],
      "clean": ["pwsh ./scripts/build.ps1 -clean"],
      "copy": ["pwsh ./scripts/copy.ps1 $0:?"],
      "logcat": ["pwsh ./scripts/start-logging.ps1"],
      "qmod": ["pwsh ./scripts/build.ps1", "pwsh ./scripts/createqmod.ps1"],
      "restart": ["pwsh ./scripts/restart-game.ps1"],
      "stack": ["pwsh ./scripts/ndk-stack.ps1"],
      "tomb": ["pwsh ./scripts/pull-tombstone.ps1"]
    },
    "qmodIncludeDirs": ["./build", "./extern/libs"],
    "qmodOutput": "./MyQuestMod.qmod"
  },
  "dependencies": [
    { "id": "beatsaber-hook", "versionRange": "^9.0.0", "additionalData": {} },
    { "id": "scotland2", "versionRange": "^0.1.4", "additionalData": { "includeQmod": false } },
    { "id": "paper", "versionRange": "^3.0.0", "additionalData": {} }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `info.id` | Mod ID. Also the config filename and default `.so` name |
| `overrideSoName` | Forces the output name; keep `lib<id>.so` unless there is a reason not to |
| `additionalData.cmake` | Tells QPM this is a CMake project |
| `workspace.scripts` | Shorthands for `qpm s <name>` |
| `qmodIncludeDirs` | Directories scanned when assembling the QMOD |
| `qmodOutput` | Output `.qmod` path |
| `dependencies[].additionalData.includeQmod` | `false` for loaders/runtime libraries that must not be bundled |

Version ranges: `^x.y.z` allows compatible minors. Pin exact versions when a dependency is tightly coupled to the game build.

Do not hardcode latest versions from this document. Check the QPM registry:

```powershell
qpm dependency add beatsaber-hook
qpm dependency add bs-cordl
```

## `mod.template.json`

Template placeholders (`${...}`, `#{...}`) are filled by QPM into `mod.json` at QMOD build time.

```json
{
  "$schema": "https://raw.githubusercontent.com/Lauriethefish/QuestPatcher.QMod/main/QuestPatcher.QMod/Resources/qmod.schema.json",
  "_QPVersion": "0.1.1",
  "name": "${mod_name}",
  "id": "${mod_id}",
  "author": "YourName",
  "version": "0.1.0",
  "packageId": "com.beatgames.beatsaber",
  "packageVersion": "1.35.0_8016709773",
  "description": "What the mod does.",
  "dependencies": [],
  "modFiles": ["${binary}"],
  "libraryFiles": [],
  "coverImage": "cover.png",
  "fileCopies": []
}
```

| Field | Notes |
| --- | --- |
| `packageVersion` | Exact Beat Saber Android package version; must match the target build |
| `dependencies` | Other mods required at runtime; QPM validates them |
| `modFiles` | The mod's own `.so`; `${binary}` resolves to the built library |
| `libraryFiles` | Bundled shared libraries used by the mod |
| `coverImage` | 1024×512 PNG/JPG/GIF, under 2 MB |
| `fileCopies` | Extra files copied to device paths at install |

`mod.json` is generated. Do not hand-edit it; run `qpm qmod build` to regenerate.

## CMake

`CMakeLists.txt` defines the Android shared library and pulls in QPM's CMake helpers. The template's `cmake/targets/quest.cmake` sets Android ABI, API level, and output naming. Unless you have a specific reason:

- keep `lib<id>.so` naming,
- keep the `quest` target,
- avoid changing STL or exception settings; the NDK and il2cpp boundary are sensitive.

## Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `build.ps1` | `qpm s build` | Configure and build; no QMOD |
| `copy.ps1` | `qpm s copy` | Build, push `.so` to the headset, restart the game |
| `createqmod.ps1` | `qpm s qmod` | Build and package a `.qmod` |
| `start-logging.ps1` | `qpm s logcat` | Stream logcat; `-self` filters to the mod |
| `pull-tombstone.ps1` | `qpm s tomb` | Pull the newest crash tombstone; `-analyze` maps frames to source |
| `ndk-stack.ps1` | `qpm s stack` | Symbolicate a native stack trace |
| `restart-game.ps1` | `qpm s restart` | Force-stop and relaunch Beat Saber |
| `validate-modjson.ps1` | `qpm s validate` | Generate and schema-check `mod.json` |

All scripts accept `--help`.

`copy.ps1` supports log flags:

```powershell
copy.ps1 -log -self -file latest.log
```

## Build outputs

| Path | Contents |
| --- | --- |
| `build/lib<id>.so` | Loadable native mod |
| `build/` | CMake artifacts; safe to delete for a clean build |
| `MyQuestMod.qmod` | Installable package |
| `mod.json` | Generated manifest |

## What ships in a QMOD

```text
MyQuestMod.qmod (zip)
├── mod.json
├── libmyquestmod.so
├── cover.png            # if configured
└── extra files          # if configured via fileCopies
```

`qpm s validate` must pass before publishing.

## Next

- [Hooking](hooking.md)
- [Configuration](config.md)
- [Build, test, debug](build-test-debug.md)
