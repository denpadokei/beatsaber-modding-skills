# ChroMapper: Plugin Project Setup

Canonical pages: [PLUGINS.md](https://github.com/Caeden117/ChroMapper/blob/master/PLUGINS.md) · [BUILD.md](https://github.com/Caeden117/ChroMapper/blob/master/BUILD.md)

## What you are building

A ChroMapper plugin is a **.NET Framework 4.8 class library** that references the assemblies shipped with ChroMapper and copies its output into `Plugins`. It is not a Unity project, not a BepInEx plugin, and not a Beat Saber mod.

ChroMapper 0.13.892 uses Unity **2021.3.45f1**. Its build guide recommends the Mono backend; IL2CPP breaks Harmony-dependent features. Match the build you target: a plugin compiled against a different ChroMapper build may load and then fail at runtime.

## Prerequisites

| Requirement | Detail |
| --- | --- |
| ChroMapper | A real install, launched at least once. Get it through [CML](https://cm.topc.at/dl) |
| IDE | Visual Studio 2022 (recommended) or Rider. The official guide uses Visual Studio |
| .NET Framework 4.8 targeting pack | Required to compile `net48`; install it as an individual component in the VS installer |
| Harmony | Bundled with ChroMapper as `0Harmony.dll`; do not add your own Harmony package |

The official workflow is Windows-centric. macOS and Linux can compile with Mono/MSBuild, but the templates and community tooling assume Windows. Say so rather than promising a cross-platform build.

## 1. Point the project at ChroMapper

Set a `ChroMapperDir` environment variable to the folder that contains `ChroMapper.exe`:

```text
ChroMapperDir = C:\TOOL\ChroMapper\chromapper
```

Verify that this file exists before opening the IDE:

```text
%ChroMapperDir%\ChroMapper_Data\Managed\Main.dll
```

MSBuild imports environment variables as properties, so `$(ChroMapperDir)` works in the project file without any extra props file. A `Directory.Build.props` next to the solution also works:

```xml
<Project>
  <PropertyGroup>
    <ChroMapperDir>C:\TOOL\ChroMapper\chromapper</ChroMapperDir>
  </PropertyGroup>
</Project>
```

Do not commit a machine-specific `ChroMapperDir`. Keep it in the environment or in an untracked local props file.

## 2. Create the project

1. Create a **Class Library (.NET Framework)** targeting **.NET Framework 4.8**.
2. Name the assembly after the plugin, for example `MyChroMapperPlugin`. The assembly name is not the display name.
3. Replace the generated project file with [ChroMapperPlugin.csproj.txt](../assets/ChroMapperPlugin.csproj.txt), or edit the references by hand using the table below. The asset also expects `Plugin.cs` and `HarmonyPatch.cs`; copy both or remove the `HarmonyPatch.cs` compile item.
4. Add an `[assembly: AssemblyVersion("1.0.0.0")]` attribute. The Options → Plugins list displays this value.

If you prefer the community starting points instead of the asset:

| Template | Notes |
| --- | --- |
| [Vainstains/ChroMapperPluginTemplate](https://github.com/Vainstains/ChroMapperPluginTemplate) | `dotnet new` template; assumes `ChroMapperDir`; already wires Krafs.Publicizer and a post-build copy |
| [rynan4818/ChroMapperPluginTemplates](https://github.com/rynan4818/ChroMapperPluginTemplates) | Visual Studio 2022 project template; Japanese wiki contains a translation of the official plugin guide |
| [rynan4818/ChroMapper-PrecisionStepAdditions](https://github.com/rynan4818/ChroMapper-PrecisionStepAdditions) | Full working plugin: Harmony patches, scene hook, configuration, and custom UI |

## 3. References

All paths are under `%ChroMapperDir%\ChroMapper_Data\Managed\`.

| Assembly | When you need it |
| --- | --- |
| `Main.dll` | Always. Plugin attributes, loader types, editor classes, CMUI, `PersistentUI`, `RequirementCheck`, `ExtensionButtons` |
| `Plugins.dll` | ChroMapper's SimpleJSON library, if you do not want to add your own JSON dependency |
| `0Harmony.dll` | Harmony patches. Use the bundled copy so patch state matches the host |
| `UnityEngine.CoreModule.dll` | `GameObject`, `Debug`, `Resources`, `Sprite`, `Application`, coroutines |
| `UnityEngine.UI.dll` | uGUI controls |
| `UnityEngine.UIModule.dll` | Canvas and UI infrastructure |
| `UnityEngine.InputLegacyModule.dll` | Legacy `Input` API |
| `Unity.InputSystem.dll` | The Input System used by ChroMapper |
| `Unity.TextMeshPro.dll` | TextMeshPro text |
| `UnityEngine.ImageConversionModule.dll` | `Texture2D.EncodeToPNG` and image conversion |
| `UnityEngine.AudioModule.dll` | Audio playback |
| `UnityEngine.TextRenderingModule.dll` | Fonts and text rendering |
| `UnityEngine.UnityWebRequestModule.dll` | HTTP requests |
| `FileBrowser.dll` | ChroMapper's cross-platform file browser |
| `Intersections.dll` | ChroMapper's raycasting system |
| `Input.dll` | ChroMapper's input actions |
| `LiteNetLib.dll` | Networking, only if the plugin needs it |

Two rules for every ChroMapper and Unity reference:

```xml
<Reference Include="Main">
  <HintPath>$(ChroMapperDir)\ChroMapper_Data\Managed\Main.dll</HintPath>
  <Private>False</Private>
</Reference>
```

- **`<Private>False</Private>` (Copy Local = false).** Never copy `Main.dll`, `0Harmony.dll`, or Unity assemblies into `Plugins`. The host already has them; duplicates cause type-identity mismatches and can break Harmony.
- **Reference the installed assemblies, not NuGet packages.** There is no ChroMapper NuGet package and no supported substitute.

`System`, `System.Core`, `System.Data`, and `System.Xml` are ordinary framework references and can stay.

## 4. Publicizer only when you need internals

Most plugin-facing APIs are public: `Plugin`/`[Plugin]`, `[Init]`, `[Exit]`, `ExtensionButtons`, `RequirementCheck`, `PersistentUI`, `DialogBox`, and the CMUI components.

`PluginLoader` is **internal**, so `PluginLoader.LoadedPlugins` and `PluginLoader.PluginsLoadedEvent` are not visible to a normal plugin. To reach them, add [Krafs.Publicizer](https://github.com/Krafs/Publicizer):

```xml
<ItemGroup>
  <PackageReference Include="Krafs.Publicizer" Version="2.3.0" PrivateAssets="all" />
</ItemGroup>

<ItemGroup>
  <!-- Publicize only the assembly you need. -->
  <Publicize Include="Main" />
</ItemGroup>
```

Publicizer defaults to publicizing **nothing**. `<PublicizeAll>true</PublicizeAll>` publicizes every referenced assembly, which is usually broader than necessary. The alternative to publicizing is reflection:

```csharp
var loaderType = Type.GetType("PluginLoader, Main");
var loaded = loaderType?.GetProperty("LoadedPlugins", BindingFlags.Public | BindingFlags.Static)
    ?.GetValue(null);
```

Prefer public APIs; internals change without notice.

## 5. Build and deploy

The project asset runs a post-build copy:

```xml
<Target Name="Deploy" AfterTargets="Build" Condition="'$(ChroMapperDir)' != ''">
  <MakeDir Directories="$(ChroMapperDir)\Plugins" />
  <Copy SourceFiles="$(TargetPath)" DestinationFolder="$(ChroMapperDir)\Plugins" />
  <Copy SourceFiles="$(TargetDir)$(TargetName).pdb"
        DestinationFolder="$(ChroMapperDir)\Plugins"
        Condition="Exists('$(TargetDir)$(TargetName).pdb')" />
</Target>
```

If the copy fails with a sharing violation, ChroMapper is still running and holds the DLL open. Close it and rebuild.

For a release, copy only the plugin DLL and any dependency DLLs that are **not** shipped with ChroMapper. Ship the PDB only if you want readable stack traces; it is not required.

## 6. Test

1. Launch ChroMapper from the same install that `ChroMapperDir` points at.
2. Open **Options → Plugins**. The plugin must appear with its display name and assembly version.
3. Exercise the feature in the editor.
4. Read `ChroMapper.log` (Windows: `%USERPROFILE%\AppData\LocalLow\BinaryElement\ChroMapper\ChroMapper.log`) and the in-game console.

Plugins are **not loaded in the Unity Editor**. `PluginLoader` contains `private const bool loadPluginsInEditor = false;`. Testing inside Unity requires building ChroMapper from source and changing that constant, which is a development-only change. The normal loop is: build the DLL, copy it into `Plugins`, launch the player, read the log.

For breakpoints, the practical options are:

- Log-driven debugging (`Debug.Log`, `Debug.LogException`) against the shipped player.
- Build ChroMapper from source in Unity 2021.3.45f1 and attach to the player/editor. BUILD.md explicitly recommends the Mono backend; IL2CPP breaks Harmony-dependent features.

Do not tell users to replace their ChroMapper install with a debug build to troubleshoot a plugin.

## 7. Common build and load errors

| Error | Cause | Fix |
| --- | --- | --- |
| `MSB3245` or unresolved `Main.dll` | `ChroMapperDir` unset or pointing at the wrong folder | Set it to the folder containing `ChroMapper.exe`; confirm `ChroMapper_Data\Managed\Main.dll` exists |
| `CS0246` type or namespace not found | Missing reference for the Unity module or ChroMapper assembly | Add the assembly from `ChroMapper_Data\Managed` |
| `CS0122` inaccessible due to protection level | You are using an `internal` ChroMapper type | Publicize `Main` or use reflection |
| Post-build copy fails | ChroMapper is running and locks the DLL | Close ChroMapper, rebuild |
| Plugin appears but logs "Incompatible plugin" | Class not public, no public parameterless constructor, or two methods share one loader attribute | Fix the type; one method per `[Init]`/`[Exit]`/event attribute |
| `FileNotFoundException` for a dependency | Bundled dependency missing from the plugin folder | Copy the dependency DLL next to the plugin |
| Plugin works in one ChroMapper build and not another | Version mismatch | Rebuild against the running build |

## 8. Language level

Unity 2021.3 supports C# 9. Set `<LangVersion>9.0</LangVersion>` unless you have a reason to go higher. Records and `init` accessors need an `IsExternalInit` shim on `net48`; avoid them for a plugin that has to stay simple.

## Sources

- PLUGINS.md project setup: <https://github.com/Caeden117/ChroMapper/blob/master/PLUGINS.md>
- Build guide and Unity version: <https://github.com/Caeden117/ChroMapper/blob/master/BUILD.md>
- Plugin loader: <https://github.com/Caeden117/ChroMapper/blob/master/Assets/__Scripts/PluginLoader/PluginLoader.cs>
- Krafs.Publicizer usage: <https://github.com/Krafs/Publicizer>
- Community template: <https://github.com/Vainstains/ChroMapperPluginTemplate>
- Visual Studio templates: <https://github.com/rynan4818/ChroMapperPluginTemplates>
- Japanese walkthrough: <https://note.com/rynan/n/nb1aa807bea9d>
