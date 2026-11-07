# ChroMapper: CMUI, Harmony, and Scenes

Canonical sources: [CMUI](https://github.com/Caeden117/ChroMapper/tree/master/Assets/__Scripts/CMUI) · [DialogBox.cs](https://github.com/Caeden117/ChroMapper/blob/master/Assets/__Scripts/CMUI/DialogBox.cs) · [Harmony docs](https://harmony.pardeike.net/articles/patching.html)

ChroMapper gives plugins a loader and a small UI toolkit. Everything beyond that is done by patching the editor with Harmony and attaching Unity components.

## Harmony

ChroMapper ships `0Harmony.dll` in `ChroMapper_Data\Managed`. Reference that copy; do not add a different Harmony NuGet package.

```csharp
using System.Reflection;
using HarmonyLib;

[Plugin("My Plugin")]
public class Plugin
{
    private const string HarmonyId = "com.example.MyPlugin";
    private Harmony harmony;

    [Init]
    private void Init()
    {
        harmony = new Harmony(HarmonyId);
        harmony.PatchAll(Assembly.GetExecutingAssembly());
    }

    [Exit]
    private void Exit()
    {
        harmony.UnpatchSelf();
    }
}
```

- Use a unique reverse-domain ID. Reusing another mod's ID makes `UnpatchSelf()` remove patches you do not own.
- `PatchAll(assembly)` applies every class in the assembly carrying `[HarmonyPatch]`.
- `UnpatchSelf()` removes only that Harmony instance's patches.

### Patch classes

```csharp
using HarmonyLib;

[HarmonyPatch(typeof(PrecisionStepDisplayController), "UpdateText")]
internal static class PrecisionStepDisplayController_UpdateTextPatch
{
    private static bool Prefix(int newSnapping)
    {
        // Return false to replace the original; return true to continue.
        return true;
    }
}
```

| Patch | Runs | Use for |
| --- | --- | --- |
| Prefix | Before the original | Gate execution (`return false`), validate or replace arguments, capture state |
| Postfix | After the original | Observe completion, read or replace `__result` |
| Transpiler | Compiles into the original IL | Changing internals with no hook point; last resort |
| Finalizer | After the original, including exceptions | Cleanup or exception suppression |

Special parameters: `__instance` (the object), `__result` (return value), `___fieldName` (private field), and the original argument names. A patch must match the target signature; wrong parameter names or types fail at patch time.

### Finding targets

1. Search the ChroMapper source under [`Assets/__Scripts`](https://github.com/Caeden117/ChroMapper/tree/master/Assets/__Scripts). Read the file for the build you target.
2. Or decompile the installed `Main.dll` with ILSpy or dnSpy. This is the exact assembly the plugin will run against.
3. Use `nameof` when the member is accessible. Use a string for private or internal members:

   ```csharp
   [HarmonyPatch(typeof(SomeEditorClass), nameof(SomeEditorClass.PublicMethod))]
   [HarmonyPatch(typeof(SomeEditorClass), "PrivateMethod")]
   ```

### Rules that prevent most breakage

- Prefer postfix → prefix → transpiler, in that order.
- Patch stable, high-level methods. Avoid constructors, compiler-generated lambdas, and UI internals.
- A patch exception propagates into the caller and can break the editor. Wrap risky code in `try/catch` and log with `Debug.LogException`.
- Patches on per-frame or per-note methods run constantly. Keep them allocation-free where possible.
- A Harmony patch is the most version-sensitive part of a plugin. Pin the ChroMapper build and retest after every update.

## Scenes and Unity components

ChroMapper uses five enabled scenes:

| Build index | Scene | Use |
| --- | --- | --- |
| 0 | `00_FirstBoot` | Startup, plugin load, persistent services |
| 1 | `01_SongSelectMenu` | Song selection |
| 2 | `02_SongEditMenu` | Per-song settings and difficulty selection |
| 3 | `03_Mapper` | The actual map editor |
| 4 | `04_Options` | Settings |

Scene indexes come from `ProjectSettings/EditorBuildSettings.asset`; `99_EditorHelper` and `999_PrefabBuilding` are disabled.

A typical plugin waits for the mapper scene, finds an existing object, and attaches a behaviour:

```csharp
using System.Linq;
using UnityEngine;
using UnityEngine.SceneManagement;

private static void OnSceneLoaded(Scene scene, LoadSceneMode mode)
{
    if (scene.buildIndex != 3) return;

    var target = Resources.FindObjectsOfTypeAll<PrecisionStepDisplayController>()
        .FirstOrDefault(controller => controller.gameObject.scene.IsValid());

    if (target == null) return;
    if (target.gameObject.GetComponent<MyEditorBehaviour>() != null) return;

    target.gameObject.AddComponent<MyEditorBehaviour>();
}
```

- `Resources.FindObjectsOfTypeAll<T>()` also returns assets and prefabs. Filter with `gameObject.scene.IsValid()` when you need a live scene object.
- Guard against adding the same component twice when the scene reloads.
- Unsubscribe from `SceneManager.sceneLoaded` in `[Exit]`.
- `MonoBehaviour` gives you `Update`, `StartCoroutine`, and `OnGUI`. Prefer a component over a static update loop.

ChroMapper also has many `public` controller types. If a type is `internal`, publicize `Main` or use reflection; patching a private method by name needs no visibility change.

## CMUI dialogs

CMUI is ChroMapper's component-based UI. Use it instead of building uGUI hierarchies by hand.

```csharp
var dialog = PersistentUI.Instance.CreateNewDialogBox()
    .WithTitle("My Plugin");

dialog.AddComponent<TextComponent>()
    .WithInitialValue("Configure the plugin.");

dialog.AddComponent<ToggleComponent>()
    .WithLabel("Enabled")
    .WithInitialValue(() => Config.Enabled)
    .OnChanged(value => Config.Enabled = value);

dialog.AddComponent<SliderComponent>()
    .WithLabel("Opacity")
    .WithSliderParams(0f, 1f, 0.01f)
    .WithInitialValue(() => Config.Opacity)
    .OnChanged(value => Config.Opacity = value);

dialog.AddFooterButton(() => Config.Save(), "Save");
dialog.Open();
```

### DialogBox

| Member | Behaviour |
| --- | --- |
| `PersistentUI.Instance.CreateNewDialogBox()` | Instantiates the dialog prefab. This is the current name; `PLUGINS.md` still says `CreateDialogBox()` |
| `WithTitle(string)` | Sets a plain title; a localized overload exists |
| `WithNoTitle()` | Removes the title |
| `AddComponent<T>()` | Instantiates a CMUI component from the component store and returns it |
| `AddFooterButton(Action onClick, string label)` | Adds a footer button; clicking it closes the dialog after running the callback |
| `OnQuickSubmit(Action)` | Runs on the quick-submit input |
| `Open()` / `Close()` | Shows or hides the dialog |
| `Clear()` | Removes components |
| `DontDestroyOnClose()` | Keeps the dialog after close. You become responsible for destroying it |

A custom dialog self-destructs when closed **unless** you call `DontDestroyOnClose()`. Do not cache a dialog across closes without that call.

### Components

| Component | Value type | Extra API |
| --- | --- | --- |
| `TextComponent` | `string` | `WithInitialValue(string)` or localized overload |
| `TextBoxComponent` | `string` | `OnEndEdit`, `OnSelect`, `OnDeselect`, `WithContentType`, `WithLineType`, `WithMaximumLength` |
| `ToggleComponent` | `bool` | `WithInitialValue`, `OnChanged` |
| `SliderComponent` | `float` | `WithSliderParams(min, max, precision)`, `WithDisplay`, `WithCustomDisplayFormatter` |
| `DropdownComponent` | `int` | `WithOptions<T>(IEnumerable<T>)`, `WithOptions<T>()` for enums |
| `ButtonComponent` | — | `OnClick`, `WithLabel`, `WithBackgroundColor` |
| `ColorPickerComponent` | colour | Adds a colour picker |
| `NestedColorPickerComponent` | colour | Nested picker |
| `ProgressBarComponent` | — | Progress display |

Common chaining methods:

```csharp
component.WithLabel("Label");          // plain text
component.WithLabel(table, key);       // localized
component.WithNoLabel();
component.WithInitialValue(value);     // value overload
component.WithInitialValue(() => value); // accessor overload
component.OnChanged(value => { });
```

`TextComponent` extends `CMUIComponent<string>` rather than `CMUIComponentWithLabel<string>`, so `WithLabel` does not apply to it. `ButtonComponent` extends `CMUIComponentBase`, so it has no value or `OnChanged`.

### CMUI outside a dialog

`DialogBox.AddComponent<T>()` is the supported path for plugin dialogs. To attach a component to your own UI, use the component store:

```csharp
var component = ComponentStoreSO.Instance.InstantiateCMUIComponentForComponentType(typeof(ToggleComponent));
var handled = ComponentStoreSO.Instance.InstantiateCMUIComponentForHandledType(typeof(bool));
```

You own the lifetime of components created this way; cache and destroy them yourself.

### UI rules

- Create components through the store or `AddComponent<T>()`; do not `new` a MonoBehaviour.
- Do not block the main thread. Use a coroutine for multi-frame work.
- Keep the dialog small and put advanced options behind a second dialog.
- Persist settings yourself; CMUI is presentation only. Write JSON to `Application.persistentDataPath`, not into the read-only install directory.

## Configuration

ChroMapper has no plugin config system. Common approaches:

- `JsonUtility` with a `[Serializable]` class, written to `Application.persistentDataPath`.
- `Plugins.dll` (SimpleJSON) or your own serializer.
- A static `Config` class with a `Save()` method called from a footer button or `OnChanged`.

Do not assume the ChroMapper install directory is writable. Users may install under a protected path, and the launcher may replace the folder on update.

## Sources

- CMUI source: <https://github.com/Caeden117/ChroMapper/tree/master/Assets/__Scripts/CMUI>
- DialogBox API: <https://github.com/Caeden117/ChroMapper/blob/master/Assets/__Scripts/CMUI/DialogBox.cs>
- Component store: <https://github.com/Caeden117/ChroMapper/blob/master/Assets/__Scripts/CMUI/CMUI%20Components/ComponentStoreSO.cs>
- Extension buttons: <https://github.com/Caeden117/ChroMapper/blob/master/Assets/__Scripts/MapEditor/UI/Extensions/ExtensionButtons.cs>
- Scene list: <https://github.com/Caeden117/ChroMapper/blob/master/ProjectSettings/EditorBuildSettings.asset>
- Example plugin: <https://github.com/rynan4818/ChroMapper-PrecisionStepAdditions>
- Harmony patching docs: <https://harmony.pardeike.net/articles/patching.html>
- PLUGINS.md CMUI section: <https://github.com/Caeden117/ChroMapper/blob/master/PLUGINS.md>
