# ChroMapper: Plugin API

Canonical sources: [PLUGINS.md](https://github.com/Caeden117/ChroMapper/blob/master/PLUGINS.md) · [`Assets/__Scripts/PluginLoader`](https://github.com/Caeden117/ChroMapper/tree/master/Assets/__Scripts/PluginLoader) · [`Assets/__Scripts/Requirements`](https://github.com/Caeden117/ChroMapper/tree/master/Assets/__Scripts/Requirements)

ChroMapper's plugin API is deliberately small. The loader discovers types, calls lifecycle methods, and exposes a few registration hooks. Everything else is done with Harmony patches and Unity APIs.

## How the loader works

Simplified from `PluginLoader.LoadAssemblies()`:

```csharp
foreach (var file in Directory.GetFiles("Plugins", "*.dll", SearchOption.AllDirectories))
{
    var assembly = Assembly.LoadFile(Path.GetFullPath(file));

    foreach (var type in assembly.GetExportedTypes())
    {
        var pluginAttribute = type.GetCustomAttribute<PluginAttribute>();
        if (pluginAttribute == null) continue;

        var plugin = new Plugin(pluginAttribute.Name, assembly.GetName(),
            Activator.CreateInstance(type));
        plugins.Add(plugin);
    }
}

foreach (var plugin in plugins)
    plugin.Init();

PluginsLoadedEvent.Invoke(plugins.ToArray());
```

What this means in practice:

- The scan is recursive under `Plugins`, so a plugin folder can hold its own dependency DLLs.
- `Assembly.LoadFile` is used; there is no load-context isolation, dependency resolver, or per-plugin unload.
- Only **public exported types** are considered.
- The type must have a **public parameterless constructor**.
- Every plugin is constructed before any `[Init]` runs. There is no dependency order.
- File enumeration order is not guaranteed.
- `Assembly.LoadFile` and `GetExportedTypes()` are **not** wrapped in the per-type try/catch. A missing dependency or unreadable assembly can abort the rest of the scan. Failure isolation is the user's job: remove plugins until loading returns.

## The plugin class

```csharp
[Plugin("My ChroMapper Plugin")]
public class Plugin
{
    [Init]
    private void Init() { }

    [Exit]
    private void Exit() { }
}
```

| Requirement | Detail |
| --- | --- |
| Attribute | `[Plugin("Display Name")]` — the string is display-only |
| Visibility | `public`; nested or internal types are skipped |
| Constructor | Public parameterless constructor; the loader calls `Activator.CreateInstance` |
| Methods | Instance or static, public or private. Binding flags include `NonPublic` |
| Attribute count | Exactly one method per attribute type. A duplicate makes the `Plugin` constructor throw and the loader report "Incompatible plugin" |
| Namespace | Any. Give the class a namespace so it does not collide with ChroMapper's own `Plugin` type |

`Plugin` objects expose:

| Member | Value |
| --- | --- |
| `Name` | The `[Plugin]` display name |
| `Version` | `AssemblyName.Version` — set with `[assembly: AssemblyVersion(...)]` |
| `AssemblyName` | Full assembly identity |

The Options → Plugins list renders `Name` and `v{Version}`. `AssemblyVersion("1.2.3.0")` displays as `v1.2.3.0`; there is no trimming.

## Lifecycle and callbacks

| Attribute | Fires | Argument | Notes |
| --- | --- | --- | --- |
| `[Init]` | Once, after every plugin is constructed | none | Main setup: Harmony, event subscriptions, UI registration |
| `[ObjectLoaded]` | When a map object's container is spawned in the editor | `Beatmap.Containers.ObjectContainer` | Fired by `BeatmapObjectContainerCollection` on container spawn |
| `[EventPassedThreshold]` | When playback passes a light event | `Beatmap.Base.BaseObject` | Fired by `PluginEventHandler`; high frequency |
| `[NotePassedThreshold]` | When playback passes a note | `Beatmap.Base.BaseObject` | Fired by `PluginEventHandler`; high frequency |
| `[Exit]` | When the plugin loader is destroyed (normally application quit) | none | Unpatch Harmony, unsubscribe events, stop coroutines |

Rules:

- The argument type must match. A wrong parameter type fails at invoke time.
- `[Init]` exceptions are caught, logged with the inner exception, and reported as `Error Loading Plugin: <name> - v<version>`. The plugin still remains in the loaded list, so a UI listing does not prove successful initialisation.
- Keep `[Init]` fast. The loader runs it synchronously during startup.
- Do not assume another plugin has initialised before yours. If you need cross-plugin coordination, use `PluginsLoadedEvent` (see below) or defer work until a scene loads.

## Loader access from a plugin

`PluginLoader` is `internal`, so a normal plugin cannot reference `PluginLoader.LoadedPlugins` or `PluginsLoadedEvent`. The members are:

```csharp
public static IReadOnlyList<Plugin> LoadedPlugins { get; }
public static Action<Plugin[]> PluginsLoadedEvent;
```

Options:

- Add Krafs.Publicizer and `<Publicize Include="Main" />` (see [project-setup.md](project-setup.md)).
- Use reflection against `PluginLoader` in `Main.dll`.

There is no plugin dependency declaration, no service registry, and no load-order control. If two plugins must cooperate, discover each other through public types or a shared file, and make the integration optional.

## Requirement checks

`RequirementCheck` lets a plugin add its own mod or feature to a map's `_requirements` or `_suggestions`. The abstract API in the **current source** is:

```csharp
using Beatmap.Base;
using Beatmap.Info;

public class MyModCheck : RequirementCheck
{
    public override string Name => "MyMod";

    public override RequirementType IsRequiredOrSuggested(
        InfoDifficulty infoDifficulty, BaseDifficulty map)
    {
        if (/* map uses MyMod data */ false)
            return RequirementType.Requirement;

        return RequirementType.None;
    }
}
```

Register it before the editor needs it:

```csharp
[Plugin("My Plugin")]
public class Plugin
{
    [Init]
    private void Init() =>
        RequirementCheck.RegisterRequirement(new MyModCheck());
}
```

| Member | Detail |
| --- | --- |
| `Name` | Written verbatim into `_requirements` / `_suggestions`; match the name the game mod declares |
| `IsRequiredOrSuggested` | Return `Requirement`, `Suggestion`, or `None` |
| `RegisterRequirement` | Adds the instance to a static `HashSet<RequirementCheck>`; keep one stable instance instead of registering repeatedly |

Caveats:

- The signature in `PLUGINS.md` is stale: it shows `BeatSaberSong.DifficultyBeatmap mapInfo, BeatSaberMap map`. Current code uses `InfoDifficulty` and `BaseDifficulty`. Compile against the build you target.
- Built-in checks (Chroma 2.0, Chroma 1.0, Noodle Extensions, Mapping Extensions, Cinema, Sound Extensions, Vivify) are registered by `RequirementCheck.Setup()` when `PersistentUI` starts. `Setup()` clears the static set first, so a registration made before it runs is lost. The documented place is `[Init]`; if the check does not survive, register again after startup with a Harmony postfix on `RequirementCheck.Setup()` or a one-shot scene-loaded hook.
- A check runs whenever ChroMapper evaluates requirements. Keep it cheap and side-effect free.

## Extension buttons

`ExtensionButtons` registers buttons in the mapper's right-side pop-out panel.

```csharp
using UnityEngine;

[Plugin("My Plugin")]
public class Plugin
{
    [Init]
    private void Init()
    {
        ExtensionButton button = ExtensionButtons.AddButton(
            iconSprite, "My tooltip", OnButtonClick);

        button.Visible = true;
        button.Interactable = true;
    }

    private void OnButtonClick() { }
}
```

| Member | Detail |
| --- | --- |
| `ExtensionButtons.AddButton(Sprite icon, string tooltip, UnityAction onClick)` | Creates and registers a button |
| `ExtensionButtons.AddButton(ExtensionButton button)` | Registers a preconfigured button |
| `ExtensionButtons.RemoveButton(ExtensionButton button)` | Unregisters it |
| `ExtensionButton.Tooltip` | Hover text |
| `ExtensionButton.Icon` | `Sprite` shown on the button |
| `ExtensionButton.Click` | `UnityAction` invoked on click |
| `ExtensionButton.Visible` / `Interactable` | Show/hide and enable/disable |

Register in `[Init]`, or at least before the mapper scene loads. The button object is a plain C# object; keep a reference if you need to change its state later.

## CMUI entry point

Current source exposes:

```csharp
DialogBox dialog = PersistentUI.Instance.CreateNewDialogBox();
```

`PLUGINS.md` documents `PersistentUI.Instance.CreateDialogBox()`, which no longer exists. Component details and examples: [cmui-and-harmony.md](cmui-and-harmony.md).

## Versioning and API stability

- ChroMapper is GPLv2 and developed in the open; the source is the specification.
- There is no semantic version for the plugin API. A minor editor release can rename a private method that a Harmony patch targets.
- `master` can be ahead of the stable build. Read the source at the tag matching the installed build when you need exact signatures.
- Pin a tested ChroMapper version in the README and release notes.
- Prefer public APIs and Harmony patches on stable, high-level methods. Avoid patching compiler-generated closures, UI internals, and constructors.

## Sources

- Loader: <https://github.com/Caeden117/ChroMapper/blob/master/Assets/__Scripts/PluginLoader/PluginLoader.cs>
- Plugin and attributes: <https://github.com/Caeden117/ChroMapper/tree/master/Assets/__Scripts/PluginLoader/Attributes>
- Requirement checks: <https://github.com/Caeden117/ChroMapper/blob/master/Assets/__Scripts/Requirements/RequirementCheck.cs>
- Built-in check example: <https://github.com/Caeden117/ChroMapper/blob/master/Assets/__Scripts/Requirements/ChromaReq.cs>
- Extension buttons: <https://github.com/Caeden117/ChroMapper/blob/master/Assets/__Scripts/MapEditor/UI/Extensions/ExtensionButtons.cs>
- Plugin guide: <https://github.com/Caeden117/ChroMapper/blob/master/PLUGINS.md>
