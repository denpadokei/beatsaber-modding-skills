# Settings

BSML's settings system is a small, opinionated framework: a host object exposes `[UIValue]` members, a `.bsml` template binds widgets to them, and the BSML settings flow writes the widgets back on **OK** and reads the host back on **Cancel**. Getting the value types and the apply/cancel model right is most of the work.

Canonical page: <https://bsmg.wiki/modding/pc/bsml.html> · Tag docs: <https://monkeymanboy.github.io/BSML-Docs/Tags/>

## 1. Register a settings menu

```csharp
using BeatSaberMarkupLanguage.Settings;
using BeatSaberMarkupLanguage.Util;

MainMenuAwaiter.MainMenuInitializing += () =>
    BSMLSettings.Instance.AddSettingsMenu(
        name: "My Mod",
        resource: "MyMod.UI.SettingsMenu.bsml",
        host: SettingsMenuHost.Instance);
```

Rules:

- `name` is unique. A duplicate name is silently ignored.
- `resource` is an embedded resource in the **calling assembly**.
- `host` is the object whose `[UIValue]` members the template binds to.
- `AddSettingsMenu` parses the template immediately (when the main menu is initializing), not when the player opens the menu. `#post-parse` runs once.
- To remove it later: `BSMLSettings.Instance.RemoveSettingsMenu(host)`.
- Call it directly from the mod assembly. `AddSettingsMenu` uses `Assembly.GetCallingAssembly()`; a helper assembly would be searched for the resource instead.

If you use SiraUtil, call it from a menu-scoped `IInitializable` instead of `MainMenuAwaiter`; see [Setup and lifecycle](setup-and-lifecycle.md).

## 2. Host shape

A settings host is a plain class. It does not need to be a `ViewController`.

```csharp
using System.Collections.Generic;
using System.ComponentModel;
using BeatSaberMarkupLanguage.Attributes;

internal class SettingsMenuHost : INotifyPropertyChanged
{
    public static SettingsMenuHost Instance { get; } = new();

    public event PropertyChangedEventHandler PropertyChanged;

    [UIValue("enabled")]
    public bool Enabled
    {
        get => PluginConfig.Instance.Enabled;
        set
        {
            PluginConfig.Instance.Enabled = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Enabled)));
        }
    }

    [UIValue("volume")]
    public float Volume
    {
        get => PluginConfig.Instance.Volume;
        set
        {
            PluginConfig.Instance.Volume = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Volume)));
        }
    }

    [UIValue("mode")]
    public string Mode { get; set; } = "Standard";

    [UIValue("modes")]
    public List<string> Modes { get; } = new() { "Standard", "One Saber", "No Arrows" };

    [UIAction("#apply")]
    private void OnApply()
    {
        // Widgets have already written their values. Persist or react here.
    }

    [UIAction("#cancel")]
    private void OnCancel()
    {
        // Widgets have already re-read the host values. Undo any side effects.
    }
}
```

- `[UIValue]` can be on a field, but a property is required for live `bind-value` updates.
- `INotifyPropertyChanged` is only needed for `bind-value="true"` or for `~property` live updates. It is not required for OK/Cancel.
- If the host only stores values and does not raise `PropertyChanged`, omit `bind-value`; the widgets still read on parse and write on OK.
- Keep the same type on both sides. A `bool` property for a toggle, `float` for a slider, `string` for a string setting, `Color` for a color setting.

## 3. Widget reference

### Toggle

```xml
<toggle-setting text="Enable feature" value="enabled"
                apply-on-change="true" bind-value="true"/>
```

```csharp
[UIValue("enabled")] public bool Enabled { get; set; }
```

Aliases: `toggle-setting`, `bool-setting`, `checkbox-setting`, `checkbox`.

### Slider

```xml
<slider-setting text="Volume" value="volume"
                min="0" max="1" increment="0.05"
                show-buttons="false" apply-on-change="true"/>
```

```csharp
[UIValue("volume")] public float Volume { get; set; } = 0.8f;
```

- `float` value by default.
- `integer-only="true"` makes the value `int` and rounds.
- `increment` also determines the slider step count; set a non-zero value.
- `show-buttons="true"` keeps the +/- buttons.

### Increment

```xml
<increment-setting text="Notes per row" value="notes-per-row"
                   min="1" max="16" increment="1" integer-only="true"
                   apply-on-change="true"/>
```

```csharp
[UIValue("notes-per-row")] public int NotesPerRow { get; set; } = 4;
```

### List (cycle)

```xml
<list-setting text="Mode" value="mode" options="modes" apply-on-change="true"/>
```

```csharp
[UIValue("mode")] public string Mode { get; set; } = "Standard";
[UIValue("modes")] public List<string> Modes { get; } = new() { "Standard", "One Saber" };
```

`list-setting` shows one option and uses the +/- buttons to cycle. `options` must be an `IList`.

### List slider

```xml
<list-slider-setting text="Mode" value="mode" options="modes"
                     show-buttons="true" apply-on-change="true"/>
```

Same value/options rules; a slider selects the index.

### Dropdown

```xml
<dropdown-list-setting text="Mode" value="mode" options="modes"
                       apply-on-change="true"/>
```

Same value/options rules; the game dropdown is used.

### String

```xml
<string-setting text="Player name" value="player-name"
                apply-on-change="true"/>
```

```csharp
[UIValue("player-name")] public string PlayerName { get; set; } = "Player";
```

`string-setting` opens `modal-keyboard`; Enter writes the value and calls `on-change` if present.

### Color

```xml
<color-setting text="Accent" value="accent"
               on-done="color-done" on-cancel="color-cancel"/>
```

```csharp
using UnityEngine;

[UIValue("accent")] public Color Accent { get; set; } = Color.cyan;

[UIAction("color-done")]
private void ColorDone(Color color) => Plugin.Log.Info($"Picked {color}");
```

`color-setting` opens `modal-color-picker`. With `apply-on-change="true"`, the chosen color is written to the host when the player presses Done; without it, the color is written on OK. `on-done` and `color-change` fire independently of `apply-on-change`; `color-change` fires while the picker is open.

### Submenu

```xml
<settings-submenu text="Advanced" hover-hint="More options">
  <settings-container>
    <toggle-setting text="Verbose logging" value="verbose" apply-on-change="true"/>
    <clickable-text text="Back" click-event="back"/>
  </settings-container>
</settings-submenu>
```

`settings-submenu` opens a nested view in the BSML mod settings flow. Its child should be a `settings-container`. The `back` event is registered by the flow; a `click-event="back"` control returns to the parent menu.

### Tabs inside a settings menu

```xml
<settings-container>
  <tab-selector tab-tag="settings-tab"/>
  <tab tags="settings-tab" tab-name="General">
    <settings-container>...</settings-container>
  </tab>
  <tab tags="settings-tab" tab-name="Advanced">
    <settings-container>...</settings-container>
  </tab>
</settings-container>
```

A tab selector inside a settings page works, but avoid nesting scroll containers excessively; each `settings-container` is already a scroll view.

## 4. Common settings attributes

| Attribute | Default | Effect |
| --- | --- | --- |
| `value` | required | `[UIValue]` id to read/write |
| `apply-on-change` | `false` | If true, write to the host on every widget change |
| `bind-value` | `false` | If true, re-read the widget when the host property changes |
| `on-change` | none | Callback with the new value on every change |
| `formatter` | none | `UIAction` returning the display string |
| `get-event` | `cancel` | Event that reads host -> widget |
| `set-event` | `apply` | Event that writes widget -> host |
| `interactable` | `true` | Enable/disable the control |

### The OK / Cancel lifecycle

BSML's mod settings flow has two buttons:

- **OK** emits `apply` to every settings menu, then restarts the game.
- **Cancel** dismisses the flow and emits `cancel` to every settings menu.

For each settings tag:

- `apply` calls `ApplyValue`, which writes the widget value through `value` to the host.
- `cancel` calls `ReceiveValue`, which reads the host value back into the widget.

Therefore:

- With `apply-on-change="false"`, edits are visible in the UI but are not written to the host until OK.
- With `apply-on-change="true"`, edits are written immediately; Cancel still re-reads the host and discards the visual edit, but any side effects your setter already performed are not undone.
- The OK restart is built into BSML. Do not add another restart. If your config is in-memory only, OK still restarts and loses it.
- `#apply` is a good place to persist to disk or apply a setting that needs a game restart.

### `formatter`

```xml
<slider-setting text="Volume" value="volume" min="0" max="1" increment="0.01"
                formatter="format-percent"/>
```

```csharp
[UIAction("format-percent")]
private string FormatPercent(float value) => $"{value * 100f:0}%";
```

The formatter receives the setting's value type:

- slider/increment: `int` when `integer-only`, otherwise `float`
- list/dropdown/list-slider: the selected object
- string: `string`

`toggle-setting` and `color-setting` do not use `formatter`; they do not display a formatted value. It must return `string`.

### `bind-value` and `INotifyPropertyChanged`

`bind-value="true"` only works when all of these are true:

1. `value` refers to a `[UIValue]` **property** (not a field).
2. The host implements `INotifyPropertyChanged`.
3. The property raises `PropertyChanged` with its own name (or an empty name for all).

If the value changes in code and the widget does not move, check these three points in that order.

## 5. Config integration

A typical BSIPA config host:

```csharp
internal class PluginConfig
{
    public static PluginConfig Instance { get; set; } = null!;

    public virtual bool Enabled { get; set; } = true;
    public virtual float Volume { get; set; } = 0.8f;
    public virtual string Mode { get; set; } = "Standard";
}
```

The settings host proxies the config:

```csharp
[UIValue("enabled")]
public bool Enabled
{
    get => PluginConfig.Instance.Enabled;
    set
    {
        PluginConfig.Instance.Enabled = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Enabled)));
    }
}
```

- Keep all persisted state in the config object, not in the settings host.
- If the config object must be saved immediately, call your persistence method in `#apply` or in the setter. Do not assume the settings host survives a menu restart.
- Do not put a `UnityEngine.Color` in a BSIPA config without a serializable representation; store floats or a hex string and convert in the property.

## 6. Gameplay setup and floating-screen settings

The OK/Cancel flow only exists in the BSML mod settings menu. For a gameplay setup tab or a floating screen:

- Use `apply-on-change="true"` for immediate effect.
- There is no `apply`/`cancel` event unless you add one.
- A `GameplaySetup.AddTab` host is parsed when the gameplay setup UI is built; `#post-parse` is still the safe initialization hook.
- A floating screen is created during gameplay; bind to your service/config directly.

## 7. Settings pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Menu does not appear | Registered too early, duplicate name, or resource not found | Use `MainMenuAwaiter`; unique name; check embedded resource |
| Menu appears but is empty | Template is empty or root is not a settings container | Use `<settings-container>` as root |
| `ValueNotFoundException` | `value`/`options` id typo or member not exposed | Match `[UIValue]`; check `[HostOptions]` |
| Slider throws on parse | `value` is `int` but `integer-only` is false, or vice versa | Match the type exactly |
| Dropdown is blank | `options` is not an `IList`, or `value` type does not match the items | Use `List<string>` + `string`, etc. |
| OK does nothing | `value` is missing or widget is not a settings tag | Add `value`; use a settings tag |
| Changes revert after OK | `apply-on-change` false and no `#apply` handling; or value wrote to a temporary object | Write to the config in the property setter |
| Widget does not update live | Field instead of property, no `INotifyPropertyChanged`, or `bind-value` false | Fix all three |
| Game restarts unexpectedly | BSML settings OK behavior | Expected; persist before OK |
| `settings-submenu` opens a blank page | Child is not a settings container, or `back` handler missing | Add `<settings-container>` and a back control |
| Two mods fight over one setting | Same config property or same menu name | Use a unique menu name and separate config object |

## 8. Source

- `BSMLSettings`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Settings/BSMLSettings.cs>
- `SettingsMenu`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Settings/SettingsMenu.cs>
- `ModSettingsFlowCoordinator` (apply/cancel): <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Settings/UI/ModSettingsFlowCoordinator.cs>
- `GenericSettingHandler`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/TypeHandlers/Settings/GenericSettingHandler.cs>
- Settings components: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/tree/master/BeatSaberMarkupLanguage/Components/Settings>
