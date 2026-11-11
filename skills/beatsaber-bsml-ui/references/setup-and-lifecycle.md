# Setup and lifecycle

This file covers the plumbing that has to be right before a template can appear: the BSML dependency, embedded resources, the loader types, when the main menu is safe to touch, and hot reload.

Canonical pages: <https://monkeymanboy.github.io/BSML-Docs/> · <https://bsmg.wiki/modding/pc/bsml.html>

## 1. Project dependency

BSML is a BSIPA plugin. Declare it as a dependency so BSIPA loads it before your mod:

```xml
<ItemGroup>
  <DependsOn Include="BSIPA" Version="4.3.7" />
  <DependsOn Include="BeatSaberMarkupLanguage" Version="1.14.2" />
</ItemGroup>
```

Reference the installed assembly with `Private=false`; never ship a copy of `BSML.dll`:

```xml
<Reference Include="BSML">
  <HintPath>$(BeatSaberDir)\Plugins\BSML.dll</HintPath>
  <Private>false</Private>
</Reference>
```

The installed file may be `Plugins\BSML.dll` or a versioned path used by the mod manager. BSMT and the BSMT MCP server can add the reference and the dependency for you; see the `beatsaber-pc-modding` skill if the project itself is not set up yet.

## 2. Embed the template

A `.bsml` file must be an embedded resource in **your** assembly. Do not copy it next to the DLL and expect BSML to find it.

SDK-style `.csproj`:

```xml
<ItemGroup>
  <None Remove="UI\**\*.bsml" />
  <EmbeddedResource Include="UI\**\*.bsml" />
</ItemGroup>
```

The resource name is based on the **root namespace**, not the assembly file name:

```text
RootNamespace = MyMod
File          = UI\SettingsMenu.bsml
Resource      = MyMod.UI.SettingsMenu.bsml
```

If you change `RootNamespace`, every resource name changes. If the computed name is not obvious, print the actual names at startup:

```csharp
foreach (string name in Assembly.GetExecutingAssembly().GetManifestResourceNames())
    Plugin.Log.Info(name);
```

Visual Studio can attach a template to its code-behind with `DependentUpon`. BSML supports the resulting no-extension resource name:

```xml
<EmbeddedResource Include="UI\SettingsView.bsml">
  <DependentUpon>SettingsView.cs</DependentUpon>
</EmbeddedResource>
```

`BSMLAutomaticViewController` first checks for `<namespace>.<class>` (the `DependentUpon` name), then `<namespace>.<class>.bsml`. An explicit `[ViewDefinition]` avoids guessing entirely.

## 3. Choose a loader

### `BSMLAutomaticViewController` (preferred)

```csharp
using BeatSaberMarkupLanguage.Attributes;
using BeatSaberMarkupLanguage.ViewControllers;

[ViewDefinition("MyMod.UI.SettingsView.bsml")]
internal class SettingsView : BSMLAutomaticViewController
{
}
```

- Parses on the first `DidActivate`.
- `[ViewDefinition]` is optional if the default resource name matches.
- The default name is `Namespace.ClassName`; `GetDefaultResourceName` assumes a non-empty namespace. Use `[ViewDefinition]` for a class in the global namespace or whenever the name is unclear.
- Supports `[HotReload]`.
- Has a safe fallback view when parsing fails: it shows `Invalid BSML` plus the exception text instead of taking down the menu.
- Best for flow coordinators, menu screens, and any view controller.

### `BSMLResourceViewController` (legacy)

```csharp
using BeatSaberMarkupLanguage.ViewControllers;

internal class SettingsView : BSMLResourceViewController
{
    public override string ResourceName => "MyMod.UI.SettingsView.bsml";
}
```

- Parses on first activation.
- No hot reload.
- Still supported; use `BSMLAutomaticViewController` for new code.

### Direct `BSMLParser.Parse`

Use this for a settings menu (which BSML parses immediately), a gameplay tab, a custom list cell, or a one-off panel:

```csharp
using BeatSaberMarkupLanguage;
using BeatSaberMarkupLanguage.Parser;
using UnityEngine;

GameObject root = new("MyUI", typeof(RectTransform));
root.transform.SetParent(parent, false);

BSMLParserParams parameters = BSMLParser.Instance.Parse(
    Utilities.GetResourceContent(Assembly.GetExecutingAssembly(), "MyMod.UI.MyPanel.bsml"),
    root,
    host);

// Later:
parameters.EmitEvent("apply");
Object.Destroy(root);
```

- The parser does not destroy the object for you. Track `root` and destroy it when the screen closes.
- `BSMLParser.Parse` throws on errors. Wrap it in `try/catch` and show your own error UI or log the exception.
- `host` may be `null` for a static template; then `~` values and actions are unavailable.
- The parent must be a Unity UI object with a `RectTransform`.

## 4. When is UI safe to create?

BSML's parser, settings service, gameplay setup service, and menu-button service are installed with the **main settings menu**. Creating a settings menu at `OnApplicationStart` is too early.

Available patterns:

### `MainMenuAwaiter` (simplest, no DI)

```csharp
using BeatSaberMarkupLanguage.Settings;
using BeatSaberMarkupLanguage.Util;

MainMenuAwaiter.MainMenuInitializing += () =>
    BSMLSettings.Instance.AddSettingsMenu("My Mod", "MyMod.UI.SettingsMenu.bsml", this);

// or, from an async method:
await MainMenuAwaiter.WaitForMainMenuAsync();
Plugin.Log.Info("Main menu is ready");
```

`MainMenuInitializing` is a static event. It fires again after an internal restart. `AddSettingsMenu` ignores duplicate names, so re-registration is harmless, but unsubscribe your own handlers if they allocate.

### SiraUtil / Zenject (preferred when already using DI)

```csharp
using BeatSaberMarkupLanguage.Settings;
using SiraUtil.Zenject;
using Zenject;

// Plugin [Init]:
// zenjector.Install<MenuInstaller>(Location.Menu);

internal class MenuInstaller : Installer
{
    public override void InstallBindings() =>
        Container.BindInterfacesTo<MenuUI>().AsSingle().NonLazy();
}

internal class MenuUI : IInitializable
{
    public void Initialize() =>
        BSMLSettings.Instance.AddSettingsMenu("My Mod", "MyMod.UI.SettingsMenu.bsml", this);
}
```

The `IInitializable` runs when the menu container is built.

### Scene transition (no BSML utility)

Hook `GameScenesManager.transitionDidFinishEvent` and check for `MenuScenesTransitionSetupDataSO`. This is more code and more fragile than `MainMenuAwaiter`; use it only when the project already owns scene flow.

Do **not** use `SceneManager.sceneLoaded` with a hard-coded scene name unless nothing else is available; Beat Saber uses additive scene transitions and the names are not a stable API.

## 5. View controller lifecycle

`BSMLAutomaticViewController` and `BSMLResourceViewController` parse in `DidActivate` when `firstActivation` is true.

```csharp
protected override void DidActivate(bool firstActivation, bool addedToHierarchy, bool screenSystemEnabling)
{
    base.DidActivate(firstActivation, addedToHierarchy, screenSystemEnabling);

    if (firstActivation)
    {
        // Safe: base has parsed the template.
    }

    if (addedToHierarchy)
    {
        // Present children or start animations.
    }
}
```

Rules:

- **Always call `base.DidActivate`** in a BSML view controller. The base call is the parser.
- Do not parse again in `DidActivate`; that creates a second UI.
- `firstActivation` is for one-time setup; `addedToHierarchy` can be true on later activations.
- Do not touch `[UIComponent]` fields in a constructor or `Awake`; they are assigned during parsing. Use `[UIAction("#post-parse")]`.
- `BSMLViewController` implements `INotifyPropertyChanged` and exposes `NotifyPropertyChanged`; call it from property setters so `bind-value` and `~` updates work.
- If you override `OnDestroy`, call `base.OnDestroy` if your base class needs cleanup. `BSMLAutomaticViewController` unregisters hot reload in `DidDeactivate`; avoid destroying the controller while a hot reload is in flight.

## 6. Hot reload

```csharp
using BeatSaberMarkupLanguage.Attributes;

[HotReload(RelativePathToLayout = @"UI\SettingsView.bsml")]
[ViewDefinition("MyMod.UI.SettingsView.bsml")]
internal class SettingsView : BSMLAutomaticViewController
{
}
```

- `[HotReload]` is conditional on `DEBUG` or `USE_HOT_RELOAD`. It is compiled out of a normal release build.
- `RelativePathToLayout` is relative to the `.cs` file that declares the class.
- BSML watches the directory for that `.bsml` file, waits about half a second after the write, then re-parses the active controller.
- If the file does not exist at runtime, the controller falls back to the embedded resource. This lets you ship the same class in a release build.
- Hot reload only reloads a controller that is active and enabled. Open the screen before editing the file.
- Use `[HotReload(PathMap = new[] { @"C:\src\MyMod", @"D:\game\Plugins\MyMod" })]` when the source and runtime directories differ (a symlinked deploy, for example).

## 7. Threading and cleanup

- Parse, assign components, load sprites, and touch GameObject properties on the Unity main thread.
- Image loading in BSML is asynchronous but resumes on the main thread; do not wrap it in your own background task.
- Remove your UI when the owner is destroyed: destroy the root GameObject from direct `Parse`, unregister menu buttons, and remove settings menus with `BSMLSettings.Instance.RemoveSettingsMenu(host)`.
- A `FloatingScreen` is not destroyed by a scene transition automatically in every case; destroy it on gameplay exit and recreate it on the next gameplay scene.

## 8. Source

- `BSMLAutomaticViewController`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/ViewControllers/BSMLAutomaticViewController.cs>
- `BSMLResourceViewController`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/ViewControllers/BSMLResourceViewController.cs>
- `MainMenuAwaiter`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Util/MainMenuAwaiter.cs>
- `HotReloadAttribute`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Attributes/HotReloadAttribute.cs>
- `Utilities.GetResourceContent`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Utilities.cs>
