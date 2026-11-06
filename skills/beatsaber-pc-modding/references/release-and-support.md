# PC: Release and Support

Canonical pages: <https://bsmg.wiki/modding/pc/>, <https://bsmg.wiki/support/> · BeatMods: <https://beatmods.com>

## Pre-release checklist

- [ ] `PluginId`, `PluginName`, `Authors`, `Version`, `GameVersion`, `Description` are correct in `Directory.Build.props`.
- [ ] Dependencies are declared and version-compatible.
- [ ] `PluginId` and `PluginName` match and contain no spaces.
- [ ] Mod builds in `Release`, not just `Debug`.
- [ ] Tested with `--verbose`, in every affected mode.
- [ ] Tested through an internal restart.
- [ ] Tested on a debug Unity player if the mod touches gameplay, Unity objects, or threading.
- [ ] No unhandled exceptions in the log during normal use.
- [ ] No per-frame logging, allocations, or `Resources.FindObjectsOfTypeAll` in hot paths.
- [ ] Config defaults are sane and the mod works with no config file present.
- [ ] Uninstall leaves no broken state (patches removed, files optional).
- [ ] README explains what it does, requirements, install, and known conflicts.

## Release build

In BSMT, switch the build configuration to `Release`, then build. Outputs:

- DLL copied into the target `Plugins` folder.
- Distributable zip in `bin\Release\net472\zip\`.

Inspect the zip before publishing:

```text
MyMod.zip
└── Plugins/
    └── MyMod.dll
```

Ship dependencies only if they are not available in the mod repository. Declare them so the installer resolves them.

## BeatMods submission

BeatMods is the repository installers pull from. Review the current [approval guidelines](https://docs.google.com/document/d/15RBVesZdS-U94AvesJ2DJqcnAtgh9E2PZOcbjrQle5Y/edit) before submitting.

Practical expectations inferred from the guidelines and wiki:

- The mod must work on the declared game version.
- No exceptions on a debug Unity build.
- Manifest metadata must be accurate and stable.
- Avoid bundling other mods' assemblies.
- Provide source or a contact path when asked.
- Accept that review can take time; respond to reviewer feedback.

Version bumps: patch for fixes, minor for features, major for breaking config or API changes.

## Automated builds and tag releases

GitHub Actions can build the mod on every push and attach the release zip to a tag automatically.

- Build workflow: checkout, `nicoco007/setup-beat-saber`, `dotnet build -c Release`, package `bin\Release\net472\Final` into a zip, upload it as an artifact.
- Release workflow: triggered by `push` of `v*` tags, builds the tagged commit, then creates a GitHub Release for that tag with the zip attached.
- `permissions: contents: write` is required for the release step.
- On GitHub Actions the standard BSMT props disable `ZipRelease`, so the workflow packages the `Final` folder rather than looking for `bin\Release\net472\zip`.

Full walkthrough, workflow files, version/tag synchronization, and troubleshooting: [automated-builds.md](automated-builds.md). Templates: [`../assets/workflows/build.yml.txt`](../assets/workflows/build.yml.txt) and [`../assets/workflows/release.yml.txt`](../assets/workflows/release.yml.txt).

Tag flow:

```powershell
# after bumping Version in Directory.Build.props and merging
git tag v1.2.3
git push origin v1.2.3
```

Verify the release page after the workflow finishes: the tag should have the zip asset and generated notes.

## Distribution outside BeatMods

GitHub Releases is the normal path for beta builds and mods not yet accepted. Attach the BSMT zip and state the exact supported game version in the release notes.

## Supporting users

Ask for, in this order:

1. The exact game version and platform (Steam / Oculus / BSManager instance).
2. The full IPA log from a `--verbose` launch, not a screenshot of the last line.
3. Whether the issue happens with only core mods installed.
4. Steps to reproduce, including game mode.

Then:

- Reproduce locally on the same version.
- Check whether another mod patches the same method.
- If the game updated, confirm compatibility before debugging the mod itself.
- Close with a concrete fix or a clear "not supported on this version" statement.

Do not ask users to run as Administrator, disable antivirus globally, or install unverified DLLs.

## Maintaining across game updates

1. Watch `#modding-announcements`.
2. Update references, `GameVersion`, and dependency versions.
3. Rebuild and run the full test matrix.
4. Re-check patches that rely on signatures or IL — these break first.
5. Publish a version per supported game version; do not advertise a range you have not tested.

## Deprecation

If the mod is no longer maintained, say so in the README and release notes, archive the repository if appropriate, and remove or flag the BeatMods listing. Users should not be left guessing whether a crash is expected.
