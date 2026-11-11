# Screens and placement

BSML does not have one "screen" API. It has five placement surfaces, each with different lifetime and navigation rules:

1. A mod settings entry (`BSMLSettings`).
2. A gameplay setup tab (`GameplaySetup`).
3. A left-screen menu button (`MenuButtons`).
4. A flow coordinator with one or more view controllers.
5. A floating screen during gameplay.

Choose the smallest surface that fits. A settings entry is not a flow coordinator; a menu button is not a settings page; a floating screen is not a menu.

## 1. Decision table

| Need | Surface | Lifetime |
| --- | --- | --- |
| Persistent options with OK/Cancel and a game restart | `BSMLSettings.AddSettingsMenu` | Main menu lifetime |
| Options that belong to the pre-game setup screen | `GameplaySetup.AddTab` | Gameplay setup lifetime |
| A tool with multiple screens | `MenuButtons` + `FlowCoordinator` | Until dismissed |
| A single panel from the left menu | `MenuButton` opening a flow coordinator or view | Until dismissed |
| HUD, overlay, or panel during a map | `FloatingScreen` | Gameplay scene |
| Confirmation / text / color popup | `modal`, `modal-keyboard`, `modal-color-picker` | Parent view |

## 2. Settings entry

```csharp
MainMenuAwaiter.MainMenuInitializing += () =>
    BSMLSettings.Instance.AddSettingsMenu("My Mod", "MyMod.UI.SettingsMenu.bsml", host);
```

- Creates an entry in the BSML **Mods** settings list.
- OK applies all settings and restarts the game.
- Cancel discards the widget edits.
- The template is parsed at main-menu initialization, not when opened.
- Full details: [Settings](settings.md).

## 3. Gameplay setup tab

```csharp
using BeatSaberMarkupLanguage.GameplaySetup;
using BeatSaberMarkupLanguage.Util;

MainMenuAwaiter.MainMenuInitializing += () =>
    GameplaySetup.Instance.AddTab(
        name: "My Mod",
        resource: "MyMod.UI.GameplayTab.bsml",
        host: gameplayTabHost,
        menuType: MenuType.All);
```

`MenuType` is a flag enum:

| Value | Shown in |
| --- | --- |
| `Solo` | Solo / standard play |
| `Online` | Online / lobby |
| `Campaign` | Campaign |
| `Custom` | Custom levels |
| `All` | All of the above |

- The host is parsed when the gameplay setup UI is built; `#post-parse` is the safe init hook.
- There is no OK/Cancel in a gameplay tab. Use `apply-on-change="true"` for settings-like controls.
- `GameplaySetup.Instance.RemoveTab("My Mod")` removes it.
- Call `AddTab` directly from the mod assembly; it uses `Assembly.GetCallingAssembly()` for the resource.

Example tab root:

```xml
<bg>
  <vertical child-control-height="false" spacing="1" pad="2">
    <toggle-setting text="Enable in gameplay" value="enabled" apply-on-change="true"/>
    <slider-setting text="Intensity" value="intensity" min="0" max="1" increment="0.05"
                    apply-on-change="true"/>
  </vertical>
</bg>
```

## 4. Menu button and flow coordinator

A menu button is the left-screen button in the main menu. A flow coordinator owns one or more view controllers and provides navigation.

### View

```csharp
using BeatSaberMarkupLanguage.Attributes;
using BeatSaberMarkupLanguage.ViewControllers;
using TMPro;

[ViewDefinition("MyMod.UI.MainView.bsml")]
internal class MainView : BSMLAutomaticViewController
{
    [UIComponent("title")]
    private TextMeshProUGUI title = null!;

    [UIAction("#post-parse")]
    private void PostParse() => title.text = "Ready";
}
```

### Flow coordinator

```csharp
using BeatSaberMarkupLanguage;
using HMUI;

internal class MainFlowCoordinator : FlowCoordinator
{
    private MainView view = null!;

    protected override void DidActivate(
        bool firstActivation,
        bool addedToHierarchy,
        bool screenSystemEnabling)
    {
        if (firstActivation)
        {
            view = BeatSaberUI.CreateViewController<MainView>();
            SetTitle("My Mod");
            showBackButton = true;
        }

        if (addedToHierarchy)
        {
            ProvideInitialViewControllers(view);
        }
    }

    protected override void BackButtonWasPressed(ViewController topViewController) =>
        BeatSaberUI.MainFlowCoordinator.DismissFlowCoordinator(this);
}
```

Rules:

- `BeatSaberUI.CreateViewController<T>()` creates a new GameObject with a Canvas and a raycaster.
- `BeatSaberUI.CreateFlowCoordinator<T>()` creates a coordinator as a new GameObject.
- `SetTitle` and `showBackButton` are only meaningful on the first activation.
- `ProvideInitialViewControllers` belongs in `addedToHierarchy`, not `firstActivation`.
- `BackButtonWasPressed` is called when the player presses the back button; dismiss the coordinator from there.
- Protect against duplicate creation with `firstActivation`.
- Do not call `PresentFlowCoordinator` from `DidActivate` of the coordinator itself; present it from the button or menu that owns it.

### Menu button

```csharp
using BeatSaberMarkupLanguage;
using BeatSaberMarkupLanguage.MenuButtons;

internal class MenuButtonRegistration
{
    private MainFlowCoordinator flow = null!;
    private MenuButton button = null!;

    public void Register()
    {
        flow = BeatSaberUI.CreateFlowCoordinator<MainFlowCoordinator>();
        button = new MenuButton("My Mod", Present);
        MenuButtons.Instance.RegisterButton(button);
    }

    public void Unregister() => MenuButtons.Instance.UnregisterButton(button);

    private void Present() =>
        BeatSaberUI.MainFlowCoordinator.PresentFlowCoordinator(flow);
}
```

`MenuButton` has two constructors:

```csharp
new MenuButton(string text, Action onClick)
new MenuButton(string text, string hoverHint, Action onClick, bool interactable = true)
```

- Registered buttons are sorted by visible text.
- A duplicate visible text is ignored.
- `MenuButton` implements `INotifyPropertyChanged`; changing `Text`, `HoverHint`, or `Interactable` updates the left screen.
- Register after the main menu; `MenuButtons` is not available at `OnApplicationStart`.
- Unregister before destroying the owning mod object, or the left screen keeps a dead callback.

### SiraUtil variant

Bind the view controller with `FromNewComponentAsViewController()` and the coordinator with `FromNewComponentOnNewGameObject()` in a menu installer. Inject them into the registration class instead of calling `BeatSaberUI.Create*` manually. The navigation code (`SetTitle`, `ProvideInitialViewControllers`, `PresentFlowCoordinator`) is the same.

## 5. Floating screen

Use a floating screen for UI that must be visible during gameplay.

```csharp
using BeatSaberMarkupLanguage;
using BeatSaberMarkupLanguage.FloatingScreen;
using HMUI;
using UnityEngine;

internal class GameplayOverlay
{
    private FloatingScreen screen = null!;

    public void Create()
    {
        screen = FloatingScreen.CreateFloatingScreen(
            screenSize: new Vector2(60f, 30f),
            createHandle: true,
            position: new Vector3(0f, 2.5f, 4f),
            rotation: Quaternion.Euler(0f, 0f, 0f),
            curvatureRadius: 120f,
            hasBackground: true);

        MainView view = BeatSaberUI.CreateViewController<MainView>();
        screen.SetRootViewController(view, ViewController.AnimationType.None);

        screen.HandleSide = FloatingScreen.Side.Bottom;
        screen.ShowHandle = true;
        screen.HandleGrabbed += (_, args) => Plugin.Log.Info($"Grab at {args.Position}");
        screen.HandleReleased += (_, args) => Plugin.Log.Info($"Release at {args.Position}");
    }

    public void Destroy()
    {
        if (screen != null)
        {
            Object.Destroy(screen.gameObject);
            screen = null!;
        }
    }
}
```

### Parameters

`FloatingScreen.CreateFloatingScreen(Vector2 screenSize, bool createHandle, Vector3 position, Quaternion rotation, float curvatureRadius = 0f, bool hasBackground = false)`

- `screenSize` is in game units, not pixels. A comfortable panel is often 40-100 wide.
- `position` and `rotation` are world-space.
- `curvatureRadius` bends the canvas; `0` is flat.
- `hasBackground` adds the game's screen mask material.
- The screen scale is set to `0.02` internally.

### Handle and movement

- `ShowHandle` creates or shows the grab handle.
- `HandleSide` is `Left`, `Right`, `Top`, `Bottom`, or `Full`.
- `ScreenSize`, `ScreenPosition`, and `ScreenRotation` can be read or assigned.
- `HandleGrabbed` and `HandleReleased` receive `FloatingScreenHandleEventArgs` with `Pointer`, `Position`, and `Rotation`.
- `HighlightHandle` toggles the handle highlight.

### Gameplay timing

Create the screen after the gameplay scene is loaded, and destroy it when leaving:

- `BSEvents.gameSceneLoaded` / `BSEvents.menuSceneLoaded` from BS Utils, if the project already uses it.
- A Harmony postfix on the game's scene transition.
- A SiraUtil gameplay installer with `IInitializable`/`IDisposable` for a gameplay-scoped service.

Do not create it in the menu and assume it survives a scene change. Do not present a menu flow coordinator from gameplay; use a floating screen or a modal on the screen.

### Menu button vs floating screen

A menu button opens a menu screen and pauses/replaces menu navigation. A floating screen lives in the world and does not navigate. Use the menu button for configuration and the floating screen for live in-map information.

## 6. Modals

Modals belong to an existing view. They start hidden and are shown by an event:

```xml
<button text="Rename" click-event="open-rename"/>

<modal show-event="open-rename" hide-event="close-rename"
       click-off-closes="true" move-to-center="true" size-delta="50 25">
  <vertical spacing="1" pad="2">
    <text text="New name"/>
    <string-setting text="Name" value="new-name" apply-on-change="true"/>
    <button text="Close" click-event="close-rename"/>
  </vertical>
</modal>
```

- `show-event` / `hide-event` are parser events, not C# events.
- `click-off-closes` dismisses on outside click.
- `move-to-center` centers the modal on the active screen.
- To open from code: `[UIParams] BSMLParserParams parserParams; parserParams.EmitEvent("open-rename");`
- Keyboard and color picker variants are documented in [Tags](tags.md) and [Settings](settings.md).

## 7. Assembly and naming rules

- `BSMLSettings.AddSettingsMenu` and `GameplaySetup.AddTab` use `Assembly.GetCallingAssembly()` for the embedded resource. Call them from the mod assembly, not a shared helper assembly.
- The settings menu name and the gameplay tab name must be unique among mods; duplicates are ignored.
- A menu button's visible text is its identity; two buttons with the same text are treated as duplicates.
- The `FlowCoordinator` and its view controllers should be created once and reused, or explicitly destroyed. Recreating them on every button press leaks GameObjects.

## 8. Cleanup checklist

- Unregister menu buttons you created.
- Remove settings menus with `BSMLSettings.Instance.RemoveSettingsMenu(host)` if the mod can be disabled.
- Remove gameplay tabs with `GameplaySetup.Instance.RemoveTab(name)`.
- Destroy floating screens when the gameplay scene ends.
- Destroy any direct `BSMLParser.Parse` root you created.
- Unsubscribe from `MainMenuAwaiter.MainMenuInitializing`, `HandleGrabbed`, `HandleReleased`, and scene events.

## 9. Source

- `BSMLSettings`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Settings/BSMLSettings.cs>
- `GameplaySetup`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/GameplaySetup/GameplaySetup.cs>
- `MenuButtons`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/MenuButtons/MenuButtons.cs>
- `MenuButton`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/MenuButtons/MenuButton.cs>
- `FloatingScreen`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/FloatingScreen/FloatingScreen.cs>
- `BeatSaberUI` factory methods: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/BeatSaberUI.cs>
