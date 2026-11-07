# ChroMapper: Distribution and Support

Canonical pages: [PLUGINS.md legal section](https://github.com/Caeden117/ChroMapper/blob/master/PLUGINS.md) · [ChroMapper license (GPLv2)](https://github.com/Caeden117/ChroMapper/blob/master/LICENSE) · [ChroMapper Discord](https://discord.gg/YmEt9EZ8pw)

## Package

Ship the plugin as a zip or as a single DLL. The install step must be obvious: extract into `Plugins` and restart ChroMapper.

Recommended layout:

```text
MyPlugin-v1.2.0-cm0.13.892.zip
├── MyPlugin.dll
├── MyPlugin.pdb              (optional, for readable stack traces)
├── dependencies\             (only DLLs ChroMapper does not already ship)
│   └── SomeLibrary.dll
├── README.md
└── LICENSE
```

Rules:

- **Do not include** `Main.dll`, `Plugins.dll`, `0Harmony.dll`, `Input.dll`, `LiteNetLib.dll`, `FileBrowser.dll`, `Intersections.dll`, or any `UnityEngine.*` / `Unity.*` assembly. ChroMapper already has them, and duplicates break the host.
- Include only third-party dependencies that are not part of ChroMapper. Check their licenses.
- Put the tested ChroMapper version in the zip name and the release title. Example: `MyPlugin-v1.2.0-cm0.13.892.zip`.
- If the plugin has a folder with dependencies, tell users to copy the **whole folder** into `Plugins`.

## README checklist

| Section | Content |
| --- | --- |
| Requirements | ChroMapper build tested, OS support, any other plugin needed |
| Install | Exact folder, zip contents, restart step |
| Uninstall | Delete the DLL/folder |
| Features | What it adds, with screenshots or a short clip |
| Known issues | Version-specific breakage, conflicts |
| Source and license | Repository URL and license |
| Support | Where to report bugs and what to attach |

State the tested build explicitly. "Works with ChroMapper" is not enough; a plugin is bound to a build.

## Release checklist

1. Rebuild against the exact ChroMapper build you tested.
2. Bump `AssemblyVersion`; the Options → Plugins list displays it.
3. Test on a clean ChroMapper install with only this plugin.
4. Test the install steps from the zip, not from your development output folder.
5. Tag the release with the same version used by the optional update manifest.
6. Attach the zip to a GitHub Release and write the tested ChroMapper version in the title.
7. Announce in the ChroMapper Discord `#plugins` channel if appropriate.

There is no official repository to submit to. ChroMapper's wiki plugin page lists only a couple of plugins; the Discord `#plugins` channel and GitHub are the practical distribution channels.

## Optional: ChroMapper-UpdateChecker manifest

[ChroMapper-UpdateChecker](https://github.com/LightAi39/ChroMapper-UpdateChecker) scans plugins for an embedded `manifest.json` and compares the `version` field with the latest GitHub release tag. It is a community plugin, not a ChroMapper standard.

Embed [manifest.json.txt](../assets/manifest.json.txt) as an **embedded resource**:

```xml
<ItemGroup>
  <EmbeddedResource Include="manifest.json" />
</ItemGroup>
```

Format — every field is required:

| Field | Value |
| --- | --- |
| `id` | Stable identifier |
| `name` | Display name |
| `author` | Author name |
| `version` | Must exactly match the GitHub release tag, including a leading `v` if you use one |
| `description` | One line |
| `git` | Repository main page URL |

The checker compares `version` to the tag on the release GitHub marks as **latest**. If they do not match, users see `name - [local version] > [latest version]`. Bump the manifest in the same commit as the version bump, and publish the matching release tag.

## Versioning

- ChroMapper has no plugin API version. Your version communicates compatibility, so include the ChroMapper build in the release metadata.
- A single plugin version should target one ChroMapper build. If you support two builds, publish two releases or two DLLs.
- Semver is fine for the plugin itself, but it says nothing about ChroMapper compatibility.
- Do not claim support for dev-channel builds unless you tested them.

## Licensing

ChroMapper is licensed under **GPLv2**. The plugin guide contains the project author's position:

> If identifiable sections of that work are not derived from the Program, and can be reasonably considered independent and separate works in themselves, then this License, and its terms, do not apply to those sections when you distribute them as separate works.

The author states that plugins distributed separately are treated as independent works, so GPLv2's source-distribution requirements are not applied to them. That is the ChroMapper project's interpretation, **not legal advice**.

Practical consequences:

- A plugin that only references `Main.dll` and uses public APIs is treated as a separate work by the project.
- If you copy ChroMapper source code, assets, or substantial internal logic into your plugin, it is a derivative work and GPLv2 applies. Do not copy source unless you are prepared to license the result under GPLv2.
- Do not redistribute ChroMapper, Unity, or Beat Saber binaries. Point users at the official launcher.
- Check the license of every bundled third-party library.
- Include a `LICENSE` file in the release.

## Security expectations

- Publish source, or at least a reproducible build, so users can inspect what runs on their machine.
- Do not download and execute code at runtime without explicit user action. If the plugin has an updater, show what will be downloaded.
- Do not request elevation. ChroMapper does not need Administrator rights, and a plugin that asks for them is suspicious.
- Do not bundle telemetry without disclosure.
- Avoid obfuscation; it makes the plugin indistinguishable from malware to users.

## Support triage

Ask for these before guessing:

1. **ChroMapper version.** It is displayed in the Options screen.
2. **Plugin name and version.** Options → Plugins shows `Name` and `v<assembly version>`.
3. **Install path.** Confirm `<folder with ChroMapper.exe>\Plugins` and that the path is writable and plain ASCII.
4. **Other plugins.** Ask the user to move all other plugins out and retest. The loader is not failure-isolated, so one bad DLL can hide the rest.
5. **Log.** Request `ChroMapper.log` (Windows: `%USERPROFILE%\AppData\LocalLow\BinaryElement\ChroMapper\ChroMapper.log`) or the full console output.
6. **Reproduction steps and the exact error text.** A screenshot of a stack trace is not enough; the log has the full trace.

Triage order:

```text
version mismatch -> install path/permissions -> isolation test -> log/stack trace -> reproduce -> fix or document
```

If the plugin is listed but does nothing, suspect a version mismatch or a Harmony target change before suspecting the user's install.

## CI note

ChroMapper assemblies are not published on NuGet, and redistributing them from your repository is not appropriate. A CI build therefore needs a ChroMapper install available on the runner:

- Cache an official ChroMapper install obtained through the launcher or Jenkins, then set `ChroMapperDir`.
- Build with MSBuild and publish the zip on a tag.
- If you cannot provision ChroMapper in CI, document a manual release build rather than shipping an unverified artifact.

Do not make CI depend on a random third-party mirror. Use the official launcher or the project's Jenkins build.

## Sources

- Plugin guide and legal section: <https://github.com/Caeden117/ChroMapper/blob/master/PLUGINS.md>
- ChroMapper license: <https://github.com/Caeden117/ChroMapper/blob/master/LICENSE>
- Build guide: <https://github.com/Caeden117/ChroMapper/blob/master/BUILD.md>
- Update checker manifest format: <https://github.com/LightAi39/ChroMapper-UpdateChecker>
- ChroMapper Discord: <https://discord.gg/YmEt9EZ8pw>
- Wiki plugin list: <https://chromapper.atlassian.net/wiki/spaces/UG/pages/2916361/Settings+-+Plugins>
