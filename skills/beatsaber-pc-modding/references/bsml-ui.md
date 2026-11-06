# PC: BSML User Interfaces

Canonical page: <https://bsmg.wiki/modding/pc/bsml.html> · Tag reference: <https://monkeymanboy.github.io/BSML-Docs/>

BeatSaberMarkupLanguage (BSML) is a tag-based UI language that mirrors Unity's GameObject hierarchy. It parses `.bsml` XML into Beat Saber UI objects and binds them to a host class.

## Setup

1. Add `BeatSaberMarkupLanguage` as a dependency and assembly reference.
2. Create a `.bsml` file. Any name works; the extension must be `.bsml`.
3. Set its build action to **EmbeddedResource**. BSML cannot load a loose file from disk by default.
4. Resource path = assembly root namespace + folder path + filename, with `.` separators. `UI/SettingsView.bsml` in project `MyMod` becomes `MyMod.UI.SettingsView.bsml`.

Optional editor support:

```xml
<bg xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:noNamespaceSchemaLocation="https://monkeymanboy.github.io/BSML-Docs/BSMLSchema.xsd">
</bg>
```

Rider: `File | Settings | Editor | File Types` → XML → add `*.bsml` for highlighting; use `Alt+Enter` on the schema URL to fetch it for completion.

## When can you create UI?

Only after the main menu exists. Pick one:

- `MainMenuAwaiter.MainMenuInitializing` (BSML only, simplest)
- SiraUtil binding with `Location.Menu` (preferred when already using DI)
- `BSEvents.earlyMenuSceneLoadedFresh` / `lateMenuSceneLoadedFresh` from BS Utils
- `GameScenesManager.transitionDidFinishEvent` plus a type check for `MenuScenesTransitionSetupDataSO`
- Unity `SceneManager.sceneLoaded` with a scene-name check (more fragile)
- A Harmony patch on a menu initialization method (last resort)

## Placement options

### Mod settings tab

```csharp
private readonly SettingsView view = new();

public void AddSettingsMenu() =>
    BSMLSettings.Instance.AddSettingsMenu(
        name: "My Mod",
        resource: "MyMod.UI.SettingsView.bsml",
        host: view);
```

### Gameplay setup tab

```csharp
GameplaySetup.Instance.AddTab(
    name: "My Mod",
    resource: "MyMod.UI.SettingsView.bsml",
    host: view);
```

### Custom menu button + flow coordinator

A flow coordinator owns one or more view controllers and appears as a left-screen button.

```csharp
[ViewDefinition("MyMod.UI.SettingsView.bsml")]
internal class SettingsView : BSMLAutomaticViewController
{
    [UIComponent("title")]
    private readonly TextMeshProUGUI title = null!;
}

internal class SettingsFlowCoordinator : FlowCoordinator
{
    private readonly SettingsView view = BeatSaberUI.CreateViewController<SettingsView>();

    protected override void DidActivate(bool firstActivation, bool addedToHierarchy, bool screenSystemEnabling)
    {
        if (firstActivation)
        {
            SetTitle("My Mod");
            showBackButton = true;
        }

        if (addedToHierarchy)
            ProvideInitialViewControllers(view);
    }

    protected override void BackButtonWasPressed(ViewController topViewController) =>
        BeatSaberUI.MainFlowCoordinator.DismissFlowCoordinator(this);
}
```

```csharp
private readonly SettingsFlowCoordinator flow = BeatSaberUI.CreateFlowCoordinator<SettingsFlowCoordinator>();
private readonly MenuButton button;

public MenuManager() => button = new MenuButton("My Mod", Show);

public void Register() => MenuButtons.Instance.RegisterButton(button);

private void Show() => BeatSaberUI.MainFlowCoordinator.PresentFlowCoordinator(flow);
```

With SiraUtil, bind the controller with `FromNewComponentAsViewController()` and the coordinator with `FromNewComponentOnNewGameObject()` instead. See [zenject-sirautil.md](zenject-sirautil.md#zenject-with-ui).

### Floating screen

Use when the UI should not live in the menu hierarchy, including during gameplay.

```csharp
var screen = FloatingScreen.CreateFloatingScreen(
    screenSize: new Vector2(25f, 10f),
    createHandle: false,
    position: new Vector3(0f, 0.5f, 2f),
    rotation: Quaternion.Euler(45f, 0f, 0f));

screen.SetRootViewController(view, ViewController.AnimationType.None);
```

`createHandle: true` lets the player reposition the screen.

## Binding UI to code

| Attribute / tag | Purpose |
| --- | --- |
| `id="..."` on a tag + `[UIComponent("...")]` | Receive the created Unity component |
| `on-click="Method"` + `public void Method()` | Button callback |
| `[UIAction("Method")]` | Bind a differently named method |
| `value="Property"` + `[UIValue("Property")]` | Two-way setting binding |
| `[UIAction("#post-parse")]` | Runs after all components are assigned |

Example view:

```xml
<bg>
  <vertical child-expand-height="false" spacing="2">
    <text id="title" text="My Mod" align="Center" font-size="6"/>
    <toggle-setting id="enabled" value="Enabled" text="Enable feature" apply-on-change="true"/>
    <slider-setting id="volume" value="Volume" text="Volume" min="0" max="1" increments="0.05" apply-on-change="true"/>
    <button id="reset" text="Reset" on-click="ResetClicked"/>
    <text id="status" text="" align="Center"/>
  </vertical>
</bg>
```

```csharp
[ViewDefinition("MyMod.UI.SettingsView.bsml")]
internal class SettingsView : BSMLAutomaticViewController
{
    [UIComponent("status")] private readonly TextMeshProUGUI status = null!;
    [UIComponent("title")] private readonly TextMeshProUGUI title = null!;

    public bool Enabled { get; set; } = true;
    public float Volume { get; set; } = 0.8f;

    public void ResetClicked()
    {
        Enabled = true;
        Volume = 0.8f;
        status.text = "Reset";
    }

    [UIAction("#post-parse")]
    public void PostParse() => title.text = "My Mod";
}
```

`[UIComponent]` fields are `null` until BSML assigns them; the `= null!` initializer is only to satisfy nullable analysis. Do not use constructors, `Awake`, or `Start` for initialization — use `#post-parse`.

## Lists

```xml
<list id="mapList" data="MapList"/>
```

```csharp
[UIComponent("mapList")] private readonly CustomListTableData list = null!;

public List<CustomListTableData.CustomCellInfo> MapList { get; } = new()
{
    new("Cell one", "subtitle"),
    new("Cell two", "subtitle"),
};

[UIAction("#post-parse")]
public void PostParse() => list.TableView.ReloadData();
```

Use `list.Data` plus `ReloadData()` when mutating the collection after the view is created.

## Incremental settings

```xml
<toggle-setting value="Enabled" text="Enabled" apply-on-change="true"/>
```

- `apply-on-change="true"` writes the property as soon as the widget changes.
- Without it, BSML applies on close/confirm; use `INotifyPropertyChanged` if external code must update the UI.
- Settings typically persist through a BSIPA `Config` object; the view property proxies it.

## Hot reload

`BSMLAutomaticViewController` reloads the `.bsml` when the file changes on disk in a development build. Use it while iterating on layout; do not rely on it for release behavior.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Could not find resource` | File not `EmbeddedResource`, or resource path wrong | Check build action and the full dotted name |
| Components are null in `Awake`/constructor | BSML assigns after parse | Move logic to `[UIAction("#post-parse")]` |
| UI appears but no callback | Method name mismatch or not public | Match `on-click`, or use `[UIAction]` |
| Setting does not persist | Property does not write through to config | Update config in the setter |
| UI created too early, throws | Menu scene not loaded | Gate on a menu-ready event |
| Duplicate objects each open | Components created outside `firstActivation` | Guard with `firstActivation` |
| Text is huge/tiny | Using `font-size` with wrong tag context | Check BSML docs for the tag's units |

Reference every supported tag in the [BSML docs](https://monkeymanboy.github.io/BSML-Docs/) rather than guessing tag names.

Starter view: [`../assets/SettingsView.bsml.txt`](../assets/SettingsView.bsml.txt).
