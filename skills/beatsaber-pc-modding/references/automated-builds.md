# PC: Automated Builds and Tag Releases

Reference workflow: <https://github.com/Auros/SiraUtil/blob/main/.github/workflows/build.yml> · Action: <https://github.com/nicoco007/setup-beat-saber>

A PC mod needs game assemblies to compile, and those assemblies cannot be committed. CI solves this by downloading the dependencies from BeatMods at build time. The release flow adds one more step: when a `v*` tag is pushed, build the mod and attach the zip to a GitHub Release for that tag.

## Verified compatibility (2026-11-06)

BeatMods migrated to API v3 in late 2026. `nicoco007/setup-beat-saber@v1` was updated for v3 on 2026-11-01 (release v1.2.3, commit `69db3c1`), and the flow was verified end-to-end:

| Check | Result |
| --- | --- |
| `GET https://beatmods.com/api/v3/games/beatsaber` | 200, 104 game versions, newest 1.45.3 |
| `GET https://beatmods.com/api/v3/mods?gameName=beatsaber` | 200, 297 projects |
| `GET https://beatmods.com/api/v3/mods/1` (BSIPA) | 200, 41 versions, 2.3 MB zip downloads |
| `setup-beat-saber@v1` on `windows-latest` | success; 297 reference files; `Libs` and `Beat Saber_Data` present |

Evidence runs: [v1 probe](https://github.com/denpadokei/beatsaber-modding-skills/actions/runs/42139967126), [exact-version probe, no warnings](https://github.com/denpadokei/beatsaber-modding-skills/actions/runs/42140297298).

Re-check before blaming the workflow:

```powershell
$h = @{ "User-Agent" = "setup-beat-saber" }
(Invoke-WebRequest "https://beatmods.com/api/v3/games/beatsaber" -Headers $h).StatusCode
(Invoke-WebRequest "https://beatmods.com/api/v3/mods?gameName=beatsaber" -Headers $h).StatusCode
(Invoke-WebRequest "https://beatmods.com/api/v3/mods/1" -Headers $h).StatusCode
```

If all three return 200, the API is up and the failure is in the manifest, dependency versions, or the action pin.

## How the reference workflow works

SiraUtil's `build.yml` does five things:

1. `actions/checkout` — clone the repository.
2. `nicoco007/setup-beat-saber` — read the project manifest and download Beat Saber reference assemblies and dependencies from BeatMods into a temp folder.
3. Optionally update a NuGet source — only needed when the project consumes a private feed.
4. `dotnet build <project>.csproj -c Release` — compile against the fetched references.
5. `actions/upload-artifact` — store the build output for later inspection.

No Beat Saber installation and no `csproj.user` are required on the runner. That is the key advantage over committing reference DLLs.

## Prerequisites

- The project builds on a clean machine with `dotnet build -c Release`.
- Manifest metadata lives in `Directory.Build.props` (`PluginId`, `Version`, `GameVersion`, dependencies), not in a local file.
- `.csproj.user` and `BeatSaberDir` are **not** required in CI.
- The project uses BSMT build targets. On GitHub Actions the standard template sets `ContinuousIntegrationBuild=true`, which skips the local `zip` output and builds a CI layout at `bin\Release\net472\Final\Plugins\`.
- Dependencies declared in `DependsOn` are available on BeatMods for the declared `GameVersion`.
- Tags use the `v` prefix: `v1.2.3`, `v1.2.3-beta.1`.

If the build works locally only because the game is installed, fix the project before adding CI. A workflow cannot compensate for absolute paths or local-only references.

## Dependency version syntax

`setup-beat-saber` reads `DependsOn` items and resolves them with **npm semver**, not NuGet ranges. This is the most common reason a build works locally but CI cannot find a dependency.

Rules verified against v1.2.3:

- **Every `DependsOn` needs a `Version`.** Without one, the action logs `No version of BSIPA found that satisfies 'undefined'` and silently skips the download (the step still exits 0).
- **Use npm semver syntax.** `4.3.7`, `^4.3.6`, `~4.3.6`, `>=4.3.6 <4.4.0` work. NuGet-style brackets such as `[4.3.7]` do **not** match.
- **The action picks the lowest satisfying version.** It sorts ascending by semver and takes the first result. `^4.3.6` selected `4.3.6+1.29.1` for Beat Saber 1.44.1 instead of `4.3.7`, then warned that it did not support that game version.
- **Pin exact versions for reproducible CI.** If you need a specific build, use `Version="4.3.7"`. Use ranges only when any compatible version is acceptable.

```xml
<ItemGroup>
  <DependsOn Include="BSIPA" Version="4.3.7" />
  <DependsOn Include="BeatSaberMarkupLanguage" Version="1.14.2" />
</ItemGroup>
```

Check the action log for one `Downloading <dependency> <version>` line per dependency. A warning such as `does not support Beat Saber <version>` or `No version ... found` means the manifest and BeatMods metadata disagree; fix it before debugging the mod.

The verification step in the workflow templates fails early if `Libs` is missing, which catches a skipped BSIPA download.

## Build workflow

Template: [`../assets/workflows/build.yml.txt`](../assets/workflows/build.yml.txt)

```yaml
name: Build

on:
  push:
    branches: [master, main]
    paths:
      - "MyMod/**"
      - ".github/workflows/build.yml"
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v7

      - name: Set up Beat Saber references
        uses: nicoco007/setup-beat-saber@v1
        with:
          project-path: ${{ github.workspace }}\MyMod\MyMod.csproj

      - name: Verify Beat Saber references
        shell: pwsh
        run: |
          if (-not $env:BeatSaberDir) { throw "BeatSaberDir is not set" }
          if (-not (Test-Path (Join-Path $env:BeatSaberDir "Libs"))) {
            throw "Dependency references are missing. Check DependsOn Version values and the setup-beat-saber log."
          }

      - name: Build Release
        run: dotnet build "${{ github.workspace }}\MyMod\MyMod.csproj" -c Release

      - name: Package release zip
        shell: pwsh
        run: |
          $final = "MyMod\bin\Release\net472\Final"
          if (-not (Test-Path $final)) { throw "CI output not found: $final" }
          New-Item -ItemType Directory -Force -Path "MyMod\bin\Release\artifacts" | Out-Null
          Compress-Archive -Path "$final\*" -DestinationPath "MyMod\bin\Release\artifacts\MyMod.zip" -Force

      - name: Upload build artifact
        uses: actions/upload-artifact@v7
        with:
          name: MyMod-${{ github.sha }}
          path: ${{ github.workspace }}\MyMod\bin\Release\artifacts\MyMod.zip
          if-no-files-found: error
          retention-days: 14
```

Notes:

- `setup-beat-saber` needs `project-path` to read `GameVersion` and dependencies. It does not need a token for public BeatMods packages.
- Use backslashes in the `project-path` on Windows. The action resolves MSBuild reference paths and mixes up forward slashes.
- The **package** step matters: on `GITHUB_ACTIONS=true` the BSMT template disables `ZipRelease` and produces `bin\Release\net472\Final\Plugins\MyMod.dll` instead. Compress `Final\*` into a zip with the `Plugins/MyMod.dll` layout that installers expect.
- If your `Directory.Build.props` does **not** disable the zip release, you can upload `bin\Release\net472\zip\*.zip` directly and skip the package step.
- If the project is at the repository root, drop the `MyMod\` prefix from every path.
- If the project references a private NuGet feed, add SiraUtil's optional step before the build:

```yaml
- name: Update private NuGet source
  run: dotnet nuget update source "my-private-feed" --username ${{ github.actor }} --password ${{ secrets.GITHUB_TOKEN }} --store-password-in-clear-text
```

## Tag-triggered release

Template: [`../assets/workflows/release.yml.txt`](../assets/workflows/release.yml.txt)

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  release:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - name: Set up Beat Saber references
        uses: nicoco007/setup-beat-saber@v1
        with:
          project-path: ${{ github.workspace }}\MyMod\MyMod.csproj

      - name: Verify Beat Saber references
        shell: pwsh
        run: |
          if (-not $env:BeatSaberDir) { throw "BeatSaberDir is not set" }
          if (-not (Test-Path (Join-Path $env:BeatSaberDir "Libs"))) {
            throw "Dependency references are missing. Check DependsOn Version values and the setup-beat-saber log."
          }

      - name: Build Release
        run: dotnet build "${{ github.workspace }}\MyMod\MyMod.csproj" -c Release

      - name: Package release zip
        shell: pwsh
        run: |
          $final = "MyMod\bin\Release\net472\Final"
          if (-not (Test-Path $final)) { throw "CI output not found: $final" }
          New-Item -ItemType Directory -Force -Path "MyMod\bin\Release\artifacts" | Out-Null
          Compress-Archive -Path "$final\*" -DestinationPath "MyMod\bin\Release\artifacts\MyMod-${{ github.ref_name }}.zip" -Force

      - name: Upload workflow artifact
        uses: actions/upload-artifact@v7
        with:
          name: MyMod-${{ github.ref_name }}
          path: ${{ github.workspace }}\MyMod\bin\Release\artifacts\MyMod-${{ github.ref_name }}.zip
          if-no-files-found: error

      - name: Attach artifacts to the tag
        uses: softprops/action-gh-release@v3
        with:
          tag_name: ${{ github.ref_name }}
          name: MyMod ${{ github.ref_name }}
          generate_release_notes: true
          prerelease: ${{ contains(github.ref_name, '-') }}
          fail_on_unmatched_files: true
          files: |
            MyMod/bin/Release/artifacts/MyMod-${{ github.ref_name }}.zip
```

Why `permissions: contents: write` is explicit: `softprops/action-gh-release` creates the release with `GITHUB_TOKEN`, and organization defaults may be read-only.

`tag_name` is the tag that triggered the run. Omitting it usually works because the action defaults to the pushed ref, but being explicit prevents surprises when the workflow is run manually.

The zip is attached to the GitHub Release for the tag, not just stored as a workflow artifact. Workflow artifacts expire; release assets do not.

## Release procedure

1. Bump `Version` in `Directory.Build.props` (SemVer).
2. Update `GameVersion` and dependency versions if the target game version changed.
3. Commit and push the change; confirm the `Build` workflow is green.
4. Create and push the tag:

    ```powershell
    git tag v1.2.3
    git push origin v1.2.3
    ```

5. The `Release` workflow builds the tag and attaches the zip to the new release.
6. Verify the release page: tag name, zip asset, and generated notes.

Keep the tag and the manifest version identical:

```powershell
$tag = "v1.2.3".TrimStart('v')
[xml]$props = Get-Content .\Directory.Build.props
if ($props.Project.PropertyGroup.Version -ne $tag) {
    throw "Directory.Build.props Version ($($props.Project.PropertyGroup.Version)) does not match tag ($tag)"
}
```

Add that check as a workflow step if drift is likely. A mismatch produces a release whose file name disagrees with the tag.

## Versioning and prereleases

| Tag | Meaning |
| --- | --- |
| `v1.2.3` | Stable release |
| `v1.2.3-beta.1` | Prerelease; `contains(github.ref_name, '-')` marks it as a GitHub prerelease |
| `v1.2.3-pc1.40.8` | Optional scheme to signal the supported game version |

Publish one release per supported game version and state it in the release body. Do not advertise a version range you have not tested.

## Artifact paths and naming

Two layouts matter:

| Context | Path | Contents |
| --- | --- | --- |
| Local Release build | `bin/Release/net472/zip/<ArtifactName>.zip` | `Plugins/MyMod.dll` |
| GitHub Actions | `bin/Release/net472/Final/` | `Plugins/MyMod.dll` |

The BSMT `Directory.Build.props` sets `ContinuousIntegrationBuild=true` and `DisableZipRelease=true` when `GITHUB_ACTIONS=true`. The `BuildForCI` target then copies the DLL into `Final\Plugins` and **no zip is produced**. That is why the workflows package `Final` themselves instead of uploading a file that does not exist.

The packaged release asset has the layout installers expect:

```text
MyMod-v1.2.3.zip
└── Plugins/
    └── MyMod.dll
```

To see both layouts locally:

```powershell
# Normal Release: produces the zip
dotnet build .\MyMod\MyMod.csproj -c Release
Get-ChildItem .\MyMod\bin\Release\net472\zip

# Simulate CI: produces Final\Plugins and no zip
$env:GITHUB_ACTIONS = "true"
dotnet build .\MyMod\MyMod.csproj -c Release
Get-ChildItem .\MyMod\bin\Release\net472\Final\Plugins
```

If no CI output appears:

- The configuration is not `Release`.
- `BSMTTaskAssembly` is missing, meaning the `nicoco007.BeatSaberModdingTools.Tasks` package or BSMT targets are not installed.
- The project uses a custom `ArtifactDestination`; adjust the `Final` path accordingly.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `setup-beat-saber` cannot resolve references | Missing `GameVersion` or dependency declared in props | Verify the manifest fields and that the dependency exists on BeatMods |
| `No version of X found that satisfies 'undefined'` | `DependsOn` has no `Version` metadata | Add an npm-semver version to every dependency |
| `No version ... satisfies '[4.3.7]'` | NuGet bracket range used | Use npm semver: `4.3.7`, `^4.3.6`, `>=4.3.6 <4.4.0` |
| `Downloading X <old version>` plus `does not support Beat Saber` | The action picks the lowest satisfying version | Pin the exact version you build against |
| `ResolveAssemblyReferences` cannot find assemblies | Forward slashes in `project-path`, or path points to a folder | Pass the `.csproj` path with backslashes |
| Build works locally, fails in CI | Absolute paths, `csproj.user`, or a local `BeatSaberDir` | Remove local assumptions; rely on the action-provided references |
| `CI output not found` in the package step | Looked for the local zip, or wrong project path | Package `bin\Release\net472\Final`; adjust the prefix for the project layout |
| Uploaded zip is empty or has no `Plugins/` folder | Compressed the wrong directory | Compress `Final\*`, not `Final` itself |
| Release job fails with 403 | `GITHUB_TOKEN` is read-only | Add `permissions: contents: write` |
| Tag push does not start the workflow | `on.push.tags` missing, or tag pushed from a fork | Add the tags filter; push the tag to the main repository |
| Release has no asset | `files` path did not match | Set `fail_on_unmatched_files: true` and fix the path |
| Version/tag mismatch | Forgot to bump props before tagging | Bump, commit, delete and recreate the tag |

## If the action breaks again

1. Check the action repository for a newer release or tag: <https://github.com/nicoco007/setup-beat-saber/releases>.
2. Pin the newest verified tag or a commit SHA instead of the floating major tag, for example `nicoco007/setup-beat-saber@v1.2.3`.
3. Run the three endpoint checks above. If BeatMods returns non-200 or a different shape, the action needs an update.
4. Manual fallback, if the action is unmaintained:
   - Download reference assemblies from `https://api.github.com/repos/nicoco007/BeatSaberReferenceAssemblies/zipball/refs/tags/v<gameVersion>`.
   - Download each dependency zip from the `downloadUrl` field of `https://beatmods.com/api/v3/mods/<projectId>`.
   - Extract them into one folder, flatten `IPA/Libs` to `Libs` and `IPA/Data` to `Beat Saber_Data`, then set `BeatSaberDir` and `GameDirectory` in `GITHUB_ENV`.
5. Do not silently fall back to committing reference DLLs. That hides version drift and bloats the repository.

## Relationship to BeatMods

The release workflow publishes a GitHub Release. BeatMods is a separate submission and review process; see [release-and-support.md](release-and-support.md#beatmods-submission). Keeping the GitHub release and BeatMods version identical makes support much easier.
