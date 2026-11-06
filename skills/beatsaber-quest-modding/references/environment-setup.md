# Quest: Environment Setup

Canonical page: <https://bsmg.wiki/modding/quest/intro.html>

## Assumed knowledge

C++ basics, CMake, ADB, and PowerShell. The guide targets Windows but is IDE-agnostic.

## Required tools

| Tool | Purpose | Install |
| --- | --- | --- |
| PowerShell 7 (`pwsh`) | Runs the template scripts | <https://github.com/PowerShell/PowerShell/releases> |
| CMake | Build generation | <https://cmake.org/download/> |
| QPM | Dependency and NDK management | <https://github.com/QuestPackageManager/QPM.CLI/releases> |
| Ninja | Build backend | `qpm download ninja` |
| Android NDK | Cross-compile for Quest | `qpm ndk download <version>` (27 in the wiki; use the version your `beatsaber-hook` declares) |
| ADB | Deploy and debug | Android platform-tools / SideQuest |
| Git | Template and dependencies | <https://git-scm.com/download/win> |

**Windows PowerShell 5 will not work** for the template scripts. Install PowerShell 7 and use `pwsh`.

## Environment variables

Add QPM, Ninja, CMake, and ADB to `PATH`. Set `ANDROID_NDK_HOME` to the extracted NDK root:

```powershell
# Use the actual path printed by `qpm ndk download <version>`
[Environment]::SetEnvironmentVariable('ANDROID_NDK_HOME', 'C:\path\to\android-ndk', 'User')
$env:Path += ';C:\tools\qpm'
```

Alternatively pin the NDK per project:

```powershell
qpm ndk pin <version>
```

`qpm ndk pin` writes the NDK path into the project so other tools resolve the same one.

## Verify the toolchain

```powershell
pwsh --version
cmake --version
qpm --version
ninja --version
adb version
$env:ANDROID_NDK_HOME
```

Every command must resolve before creating a project. QPM and Ninja frequently fail here because the terminal was opened before `PATH` changed — reopen it.

## Create a project

```powershell
qpm templatr --git https://github.com/Lauriethefish/quest-mod-template.git MyQuestMod
```

Templatr asks for mod name, ID, author, and description. Use a reverse-domain-style ID or a unique short ID; it becomes the `.so` name (`lib<id>.so`) and the config filename.

Do not create the project inside the game or ModData folders.

## Pin dependencies

`beatsaber-hook` is the il2cpp modding library. `bs-cordl` provides the generated bindings for the game's types. Their versions must match the target game version.

```powershell
cd MyQuestMod
qpm dependency add beatsaber-hook
qpm dependency add bs-cordl
qpm restore
```

To pin a specific codegen version (example: Beat Saber 1.35.0 → codegen `3500.0.0`):

```powershell
qpm dependency add bs-cordl -v ^3500.0.0
qpm restore
```

Version selection:

- `beatsaber-hook`: latest release that supports the target game version.
- `bs-cordl`: match the game version; the wiki documents the codegen number convention.
- Check existing mods for the same game version if unsure.

Edit `qpm.json` by hand only when you need a version range QPM will not resolve. Always run `qpm restore` afterward.

## IDE setup

The template ships `.vscode/` with C++ properties, launch tasks, and build tasks.

- **VS Code:** install the C/C++ and CMake Tools extensions; set the compiler to the NDK's `clang++.exe`; select the CMake kit from `CMakeLists.txt`.
- **CLion:** open the folder, configure CMake with the NDK toolchain file, and select the `quest` target.
- **Visual Studio:** open the folder as a CMake project and point CMake at the NDK toolchain.

The build does not require an IDE; `qpm s build` is the source of truth.

## Project sanity check

```powershell
qpm s build
```

A fresh template should build before any code changes. If it fails, the environment is wrong, not the mod.

Common failures:

| Error | Fix |
| --- | --- |
| `pwsh` not recognized | Install PowerShell 7 and reopen the terminal |
| `Could not find NDK` | Set `ANDROID_NDK_HOME` or run `qpm ndk pin <version>` |
| `ninja: not found` | `qpm download ninja`, add it to PATH |
| CMake cannot find toolchain | Reinstall NDK via QPM; delete `build/` and reconfigure |
| `bs-cordl` headers missing | `qpm restore`; verify the version exists for the game version |
| Permission denied during copy | ADB not authorized; accept the prompt in the headset |

## Next

- [Project structure](project-structure.md)
- [Hooking](hooking.md)
