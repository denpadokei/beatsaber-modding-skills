# PC: Project Setup

Canonical pages: <https://bsmg.wiki/modding/pc/setup.html>, <https://bsmg.wiki/modding/pc/vs-setup.html>

## Prerequisites

- Windows with a modded Beat Saber install.
- Basic to intermediate C# and Unity knowledge.
- Rider (recommended, free for non-commercial use) or Visual Studio Community.
- BeatSaberModdingTools (BSMT) extension for the chosen IDE.

Beat Saber is Unity 2022.3 with C# on .NET Framework 4.7.2. Mods are DLLs loaded by BSIPA.

## Rider setup

1. Install Rider.
2. Download the BSMT Rider plugin zip from <https://github.com/Fernthedev/BSMT-Rider/releases/latest>.
3. `Configure` → `Settings` → `Plugins` → gear menu → `Install Plugin from Disk...` → select the zip → restart.
4. Create a new solution and pick a template under `Custom Templates`.

## Visual Studio setup

1. Install Visual Studio with the `.NET desktop development` workload.
2. Install the BSMT VS extension from <https://github.com/Zingabopp/BeatSaberTemplates/>.
3. Create a project from the Beat Saber plugin templates.

## Template selection

- **Bare template** — smallest starting point; walk through [Harmony](harmony-patching.md) and [BSML](bsml-ui.md) manually.
- **Full template** — includes BSML and SiraUtil wiring; better for mods with menus and DI.

Do not create the solution inside the Beat Saber install folder. Updates and reinstalls can delete it.

## First build

Set the Beat Saber directory when prompted and enable "store this folder in config". Then build once before editing code. A successful build proves references resolve. If it fails:

- Re-select the game directory via `Tools` → `BSMT Project Tools`.
- Restart the IDE.
- Manually add references: `Dependencies` → `Add Beat Saber assembly references`, or reference DLLs from `Beat Saber_Data\Managed`.

## Project files

| File | Purpose |
| --- | --- |
| `<Name>.csproj` | Build configuration and references. |
| `<Name>.csproj.user` | Local Beat Saber path, managed by BSMT. Do not commit. |
| `Plugin.cs` | BSIPA entry point. |
| `Directory.Build.props` | Manifest metadata and dependency declarations. |
| `manifest.json` | Generated at build into the assembly; do not hand-edit. |

## `Directory.Build.props`

```xml
<PropertyGroup>
  <PluginId>MyMod</PluginId>
  <PluginName>MyMod</PluginName>
  <Authors>YourName</Authors>
  <Version>1.0.0</Version>
  <GameVersion>1.40.8</GameVersion>
  <Description>Short description of what the mod does.</Description>

  <!-- optional -->
  <ProjectSource>https://github.com/you/MyMod</ProjectSource>
  <ProjectHome>https://example.com</ProjectHome>
  <Donate>https://ko-fi.com/you</Donate>
  <PluginIcon>icon.png</PluginIcon>
</PropertyGroup>

<ItemGroup>
  <DependsOn Include="BSIPA" />
  <DependsOn Include="BeatSaberMarkupLanguage" />
  <DependsOn Include="SiraUtil" />
</ItemGroup>
```

Rules:

- Keep the `BSIPA` dependency; BSIPA requires it.
- `PluginId` and `PluginName` should be identical and space-free for BeatMods uploads.
- `Version` follows SemVer.
- `GameVersion` must exactly match the game build you compile against.
- Add `ConflictsWith`, `LoadAfter`, or `LoadBefore` when load order matters.
- Add `RequiredFile` for external libraries shipped alongside the DLL.
- Use `PluginHint` if `Plugin.cs` is moved.

## References

Reference game assemblies from `Beat Saber_Data\Managed` with `Private=false` so they are not copied into the output:

```xml
<Reference Include="Main">
  <HintPath>$(BeatSaberDir)\Beat Saber_Data\Managed\Main.dll</HintPath>
  <Private>false</Private>
</Reference>
```

Add `SiraUtil`, `Zenject`, and `Zenject-usage` when using dependency injection. Add BSML when building UI.

### Publicizing game assemblies

Install `BepInEx.AssemblyPublicizer.MSBuild` and mark the reference:

```xml
<PackageReference Include="BepInEx.AssemblyPublicizer.MSBuild" Version="0.4.2">
  <PrivateAssets>all</PrivateAssets>
  <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
</PackageReference>

<Reference Include="Main" Publicize="true">
  <HintPath>$(BeatSaberDir)\Beat Saber_Data\Managed\Main.dll</HintPath>
  <Private>false</Private>
</Reference>
```

Never publicize another mod's assembly. Use reflection or ask the maintainer.

## Build outputs

- Debug and Release builds copy the DLL into `<BeatSaberDir>\Plugins`.
- Release additionally produces a distributable zip at `bin\Release\net472\zip\`.

## Config

BSIPA's `Config` provider generates a strongly typed config object backed by `UserData/<PluginId>.json`:

```csharp
[Init]
public Plugin(Logger logger, Config config)
{
    Log = logger;
    PluginConfig.Instance = config.GenerateConfigObject<PluginConfig>();
}
```

Guidelines:

- Use `public virtual` properties so the generated subclass can intercept changes.
- Add `[NotifyPropertyChanges]` on the config class if you need `INotifyPropertyChanged`.
- Use `[SerializedName("old_name")]` to rename a property without losing existing values.
- Do not use fields; use properties.
- Treat the config object as global state: `PluginConfig.Instance` is set once in `[Init]`.

## Next

Copyable templates: [`../assets/Directory.Build.props.txt`](../assets/Directory.Build.props.txt), [`../assets/Plugin.cs.txt`](../assets/Plugin.cs.txt).

- [Harmony patching](harmony-patching.md)
- [BSML UI](bsml-ui.md)
- [Zenject and SiraUtil](zenject-sirautil.md)
