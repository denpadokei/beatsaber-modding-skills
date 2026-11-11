---
name: beatsaber-bsml-ui
description: Use when building or changing in-game UI for Beat Saber PC with BSML (BeatSaberMarkupLanguage). Covers .bsml templates, embedded resources, BSMLAutomaticViewController, settings menus, gameplay setup tabs, flow coordinators, floating screens, modals, lists, type handlers, macros, and two-way value binding. Triggers on BSML, .bsml, BSMLSettings, GameplaySetup, ViewDefinition, UIComponent, UIValue, UIAction, toggle-setting, slider-setting, custom-list, FloatingScreen.
license: MIT
metadata:
  version: "1.0.0"
  platform: "PC (Steam / Oculus / BSManager)"
  bsml_version: "1.14.2"
  canonical_source: "https://monkeymanboy.github.io/BSML-Docs/"
---

# Beat Saber PC UI with BSML

On PC, in-game UI is almost always **BSML** (BeatSaberMarkupLanguage). BSML is not a normal XML UI toolkit: a `.bsml` file is parsed at runtime into Unity GameObjects, and most attributes are applied by **type handlers** to components on those objects. That indirection is why one `text` attribute works on a `<text>`, a `<button>`, and a `<string-setting>`, and why an attribute with a typo is silently ignored instead of failing. This skill documents the parser and the shipped tags, not a guessed subset.

Verified against **BSML 1.14.2** source (`9a74f08`, 2026-07-18) and the BSML docs. If the installed BSML is older or newer, re-check the tag or type handler on the matching release; aliases and properties do change.

## 1. Decide the job

| User intent | Go to |
| --- | --- |
| "Add a settings menu", "persist a toggle", "config UI" | [Settings](references/settings.md) |
| "Add a gameplay setup tab" | [Screens and placement](references/screens-and-placement.md) |
| "Add a menu button", "open a custom screen", "flow coordinator" | [Screens and placement](references/screens-and-placement.md) |
| "Show UI during gameplay", "floating screen", "HUD" | [Screens and placement](references/screens-and-placement.md) |
| "Modal", "keyboard", "color picker", "popup" | [Screens and placement](references/screens-and-placement.md) |
| "List", "table", "dropdown", "scroll view", "page buttons" | [Lists and scrolling](references/lists-and-scrolling.md) |
| "Which tag/attribute?", "button", "text", "image", "tab" | [Tags](references/tags.md), [Type handlers](references/type-handlers.md) |
| "Layout is wrong", "size", "anchor", "background", "font", "sprite" | [Styling and assets](references/styling-and-assets.md) |
| "Two-way binding", "`~`", "`#post-parse`", "events" | [Syntax and bindings](references/syntax-and-bindings.md) |
| "Conditional UI", "repeat rows", "macro" | [Macros](references/macros.md) |
| "Custom tag", "custom component", "type handler" | [Custom tags and handlers](references/custom-tags-and-handlers.md) |
| "Blank UI", "parse error", "resource not found", "null component" | [Troubleshooting](references/troubleshooting.md) |
| "Set up BSML from zero", "embedded resource", "hot reload" | [Setup and lifecycle](references/setup-and-lifecycle.md) |

## 2. Non-negotiables

1. **The `.bsml` file must be an `EmbeddedResource`.** BSML loads it from the assembly, not from disk. A `Content`/`None` file will fail with `ResourceNotFoundException` at runtime.
2. **The resource name must match exactly.** The embedded resource name is `RootNamespace + folder path + file name + .bsml`. A `BSMLAutomaticViewController` without `[ViewDefinition]` looks for `Namespace.ClassName` first, then `Namespace.ClassName.bsml`. `[ViewDefinition]` and `AddSettingsMenu` override the lookup. Confirm with `Assembly.GetManifestResourceNames()` if unsure.
3. **One root tag per template.** A single `<bg>`, `<vertical>`, `<settings-container>`, or similar wraps everything.
4. **Create UI only after the main menu exists.** Use `MainMenuAwaiter.MainMenuInitializing`, `WaitForMainMenuAsync`, or SiraUtil's menu installer. BSML's services are installed with the main settings menu, not at app start.
5. **`[UIComponent]` is `null` until the template has been parsed.** Do not touch it in a constructor, `Awake`, or `OnEnable`. Put initialization in `[UIAction("#post-parse")]`.
6. **Do not override `DidActivate` in a `BSMLAutomaticViewController` without calling `base.DidActivate(...)`.** The base method is what parses the template on first activation.
7. **Unknown attributes are silently ignored.** BSML only reads attributes declared by a matching type handler; a typo produces no error and no effect. Verify names in [Type handlers](references/type-handlers.md).
8. **Settings `value` types must match exactly.** A slider bound to `float` cannot read an `int` field; a dropdown bound to `string` cannot read an `object` property. See [Settings](references/settings.md).
9. **`AddSettingsMenu` and `GameplaySetup.AddTab` use `Assembly.GetCallingAssembly()` to locate the resource.** Call them directly from the mod assembly, not through a shared helper library, or the resource lookup will search the wrong assembly.
10. **Use `[ViewDefinition]` + `BSMLAutomaticViewController` for new views.** `BSMLResourceViewController` is the older loader; it works but has no hot reload and no default resource naming.
11. **Do not create or destroy Unity UI from a background thread.** Image loading, parsing, and component access must run on the Unity main thread.
12. **Guard creation in `firstActivation`.** `DidActivate` can run many times; creating a second UI on every activation is a common source of duplicated objects.

## 3. Minimum working settings menu

`SettingsMenu.bsml`:

```xml
<settings-container>
  <vertical child-control-height="false" spacing="1" pad="2">
    <text text="My Mod" align="Center" font-size="6"/>
    <toggle-setting text="Enable feature" value="enabled" apply-on-change="true" bind-value="true"/>
    <slider-setting text="Volume" value="volume" min="0" max="1" increment="0.05" apply-on-change="true"/>
    <dropdown-list-setting text="Mode" value="mode" options="modes" apply-on-change="true"/>
  </vertical>
</settings-container>
```

```csharp
// Usings: System.Collections.Generic, System.ComponentModel, System.Runtime.CompilerServices,
// BeatSaberMarkupLanguage.Attributes, .Settings, .Util
internal class SettingsMenuHost : INotifyPropertyChanged
{
    public static SettingsMenuHost Instance { get; } = new();
    public event PropertyChangedEventHandler PropertyChanged;

    [UIValue("enabled")]
    public bool Enabled
    {
        get => PluginConfig.Instance.Enabled;
        set { PluginConfig.Instance.Enabled = value; Notify(); }
    }

    [UIValue("volume")]
    public float Volume
    {
        get => PluginConfig.Instance.Volume;
        set { PluginConfig.Instance.Volume = value; Notify(); }
    }

    [UIValue("mode")] public string Mode { get; set; } = "Standard";
    [UIValue("modes")] public List<string> Modes { get; } = new() { "Standard", "One Saber" };

    public static void Register() =>
        MainMenuAwaiter.MainMenuInitializing += () =>
            BSMLSettings.Instance.AddSettingsMenu("My Mod", "MyMod.UI.SettingsMenu.bsml", Instance);

    private void Notify([CallerMemberName] string name = "") =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
```

- Add `DependsOn Include="BeatSaberMarkupLanguage"` to `Directory.Build.props` and embed the `.bsml` as `EmbeddedResource`; the full project wiring is in [Setup and lifecycle](references/setup-and-lifecycle.md).
- Call `SettingsMenuHost.Register()` from `Plugin.OnApplicationStart`.
- OK writes every `value` back through `apply`, then **restarts the game**; Cancel re-reads the host and discards the widget edits. That restart is BSML behavior. Full widget list, formatters, submenus, and config patterns: [Settings](references/settings.md).

## 4. How a template becomes UI

```text
.bsml (EmbeddedResource)
  -> view controller / AddSettingsMenu / direct BSMLParser.Parse
  -> XDocument
  -> each element: BSMLTag.CreateObject(parent) creates a GameObject
  -> each component on that object: matching TypeHandler reads attributes
  -> id + [UIComponent]/[UIObject] fields are assigned
  -> children are parsed
  -> 'post-parse' event fires
```

The practical consequences:

- A tag chooses the **GameObject and its components**; a type handler chooses the **attributes** that can be set on those components.
- An attribute can affect more than one component. `<button text="Play">` works because the button tag exposes its child `TextMeshProUGUI` through `ExternalComponents`.
- `id` is handled by the parser, not by a type handler. It feeds `[UIComponent]` and `[UIObject]`; `tags` feeds macros, page buttons, and custom-list visuals.
- `~value-id` reads a `[UIValue]`; `[UIAction]` methods are looked up by id or method name; `#event` methods subscribe to parser events.

## 5. Tag and attribute cheat sheet

| Tag (aliases) | Creates | Use for |
| --- | --- | --- |
| `bg` / `background` / `div` | Backgroundable + fitter | Root container, panel |
| `vertical` | VerticalLayoutGroup | Stacked rows |
| `horizontal` | HorizontalLayoutGroup | Row of controls |
| `grid` | GridLayoutGroup | Uniform cells |
| `stack` | StackLayoutGroup | Overlay/stacked content |
| `text` / `label` | FormattableText | Label, bound text |
| `button` | Button + label | Action button |
| `icon-button` / `button-with-icon` | Button + icon | Icon action |
| `clickable-text`, `clickable-image` | Clickable controls | Link-like actions |
| `image` / `img`, `raw-image` | Image / RawImage | Sprites, textures |
| `toggle-setting` / `bool-setting` / `checkbox` | ToggleSetting | Bool setting |
| `slider-setting` | SliderSetting | Numeric range |
| `increment-setting` | IncrementSetting | +/- numeric |
| `list-setting`, `list-slider-setting`, `dropdown-list-setting` | Option settings | Choice lists |
| `string-setting` | StringSetting + keyboard | Text entry |
| `color-setting` | ColorSetting + picker | Color choice |
| `list` | CustomListTableData | Standard list |
| `custom-list` | CustomCellListTableData | Template-per-item list |
| `scroll-view`, `scrollable-container` | Scroll views | Long content |
| `settings-container` | Scrollable settings view | Settings root |
| `tab-selector` + `tab` | Tabs | Multi-page UI |
| `page-button` | PageButton | Scroll page controls |
| `modal`, `modal-keyboard`, `modal-color-picker` | Modal views | Popups |
| `settings-submenu` | Submenu view | Nested settings |
| `modifier`, `modifier-container` | Gameplay modifier toggle | Modifier UI |
| `text-page`, `leaderboard`, `loading` | Specialized views | Long text, scores, loading |

All aliases and creation details are in [Tags](references/tags.md). All attribute names and aliases are in [Type handlers](references/type-handlers.md).

## 6. Binding cheat sheet

| In `.bsml` | In C# | Meaning |
| --- | --- | --- |
| `id="foo"` | `[UIComponent("foo")] TextMeshProUGUI foo;` | Receive a component on that object |
| `id="foo"` | `[UIObject("foo")] GameObject foo;` | Receive the GameObject |
| `value="foo"` | `[UIValue("foo")] bool Foo { get; set; }` | Two-way settings value |
| `text="~foo"` | `[UIValue("foo")] string Foo { get; }` | Insert a value as text |
| `on-click="Foo"` | `[UIAction("Foo")] void Foo()` | Button/click callback |
| `on-click="Foo"` | `[UIAction("Bar")] void Foo()` + `on-click="Bar"` | Explicitly named action |
| `[UIAction("#post-parse")]` | method | Runs after the template is parsed |
| `[UIAction("#apply")]` | method | Runs when settings are applied (OK) |
| `[UIAction("#cancel")]` | method | Runs when settings are cancelled |
| `click-event="thing"` | `[UIAction("#thing")]` | Emit/subscribe to a parser event |
| `tags="selected"` | `CustomCellTableCell` | Mark a custom-list visual state |

Rules that matter:

- `[UIValue]` and `[UIAction]` can be on **private** members; BSML scans non-public members too.
- Without `[HostOptions]`, public and private fields/properties/methods are also addressable by their **member name**. Add `[HostOptions(FieldAccessOption.OptIn, PropertyAccessOption.OptIn, MethodAccessOption.OptIn)]` to force explicit attributes.
- `~` on a property is live only when the host implements `INotifyPropertyChanged` and the value is a property (not a field). Settings widgets additionally need `bind-value="true"`.
- `#post-parse`, `#apply`, `#cancel` are event subscriptions. `#`-prefixed actions are registered as events; the parser emits `post-parse` after every parse.

Full parser behavior, `HostOptions`, `BSMLParserParams`, and event details: [Syntax and bindings](references/syntax-and-bindings.md).

## 7. Settings value types

| Tag | `value` must be | Extra attributes |
| --- | --- | --- |
| `toggle-setting` | `bool` | `apply-on-change`, `bind-value`, `on-change`, `formatter` |
| `slider-setting` | `float` (or `int` with `integer-only="true"`) | `min`, `max`, `increment`, `show-buttons` |
| `increment-setting` | `float`/`int` | `min`, `max`, `increment`, `integer-only` |
| `list-setting` | element type of `options` | `options` (`IList`), `formatter` |
| `list-slider-setting` | element type of `options` | `options`, `show-buttons` |
| `dropdown-list-setting` | element type of `options` | `options` (`IList`) |
| `string-setting` | `string` | `formatter` receives the string |
| `color-setting` | `UnityEngine.Color` | `on-done`, `on-cancel`, `color-change` |

`options` must come from a `[UIValue]` that is an `IList` (for example `List<string>` or `string[]`). A `List<object>` works if the bound value is also `object`.

## 8. Choosing a placement

| Need | Use |
| --- | --- |
| Persistent options, survive restart | Settings menu via `BSMLSettings.AddSettingsMenu` |
| Options that apply to gameplay, shown in the pre-game setup | `GameplaySetup.AddTab(name, resource, host, MenuType)` |
| A top-level tool with its own screens | `MenuButtons` + `FlowCoordinator` |
| A single panel, no navigation | `MenuButtons` opening a view directly, or a settings/gameplay tab |
| HUD or overlay during a map | `FloatingScreen` created after the gameplay scene loads |
| Confirmation, keyboard, color picker | `<modal>`, `<modal-keyboard>`, `<modal-color-picker>` inside an existing view |

Do not present a menu `FlowCoordinator` from gameplay. Do not create a `FloatingScreen` in the menu and expect it to survive a scene change; create it per gameplay scene and destroy it when leaving.

## 9. Failure modes

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `ResourceNotFoundException` | File not `EmbeddedResource`, wrong `RootNamespace`, wrong path | Fix build action and resource name; list `Assembly.GetManifestResourceNames()` |
| `TagNotFoundException` | Tag typo, wrong case, XML namespace | Tag names are lowercase and case-sensitive; use the exact alias |
| `ValueNotFoundException` | `~id` or settings `value`/`options` id is missing | Add `[UIValue("id")]`, or use `[HostOptions]` opt-in correctly |
| `ActionNotFoundException` | `on-click`/`on-change`/`formatter` names do not match | Match the method name or `[UIAction]` id |
| `[UIComponent]` is null | Used before parse | Move to `[UIAction("#post-parse")]` |
| Settings changes do nothing | `apply-on-change` is false and OK was not pressed | Add `apply-on-change="true"`, or handle `#apply` |
| Widget does not update when the property changes | Field instead of property, or no `INotifyPropertyChanged` | Use a property + `INotifyPropertyChanged` + `bind-value="true"` |
| Attribute has no effect | Not declared by a matching type handler | Check [Type handlers](references/type-handlers.md); unknown attributes are ignored |
| UI is duplicated after re-entering | Created outside `firstActivation` | Guard with `firstActivation`, or create once |
| UI appears stretched or zero-sized | Anchors and layout group conflict | Use `size-delta`, `pref-width`/`pref-height`, and `child-control-*` deliberately |
| `Invalid BSML` fallback appears | Parse exception in a view controller | Read the log; the fallback includes the exception text |
| Game restarts when pressing OK | Normal BSML settings behavior | Do not add your own restart; persist before `apply` |

More: [Troubleshooting](references/troubleshooting.md).

## 10. References

- [Setup and lifecycle](references/setup-and-lifecycle.md) — project references, embedded resources, view controllers, main-menu timing, hot reload.
- [Syntax and bindings](references/syntax-and-bindings.md) — XML rules, `[UIComponent]`, `[UIValue]`, `[UIAction]`, `~`, `#`, `tags`, `BSMLParserParams`.
- [Tags](references/tags.md) — every built-in tag, aliases, created components, key attributes.
- [Type handlers](references/type-handlers.md) — every attribute alias, type, and target component.
- [Settings](references/settings.md) — settings tags, value types, apply/cancel, `INotifyPropertyChanged`, formatters, submenus.
- [Lists and scrolling](references/lists-and-scrolling.md) — `list`, `custom-list`, tables, page buttons, scroll views, custom cells.
- [Screens and placement](references/screens-and-placement.md) — settings tabs, gameplay tabs, menu buttons, flow coordinators, floating screens, modals.
- [Styling and assets](references/styling-and-assets.md) — layout recipes, backgrounds, text, localization, sprites, colors, animated images.
- [Macros](references/macros.md) — `macro.if`, `macro.for-each`, `macro.define`, `macro.as-host`, `macro.reparent`.
- [Custom tags and handlers](references/custom-tags-and-handlers.md) — extend the parser with your own tag, macro, or type handler.
- [Troubleshooting](references/troubleshooting.md) — exception-by-exception diagnosis and a bisection checklist.

Starter assets:

- [`assets/SettingsMenu.bsml.txt`](assets/SettingsMenu.bsml.txt) — settings template with the common widgets.
- [`assets/SettingsMenuHost.cs.txt`](assets/SettingsMenuHost.cs.txt) — settings host with `INotifyPropertyChanged` and config proxy.
- [`assets/FlowCoordinatorView.bsml.txt`](assets/FlowCoordinatorView.bsml.txt) — a view with a list and a post-parse hook.
- [`assets/FlowCoordinator.cs.txt`](assets/FlowCoordinator.cs.txt) — flow coordinator, menu button, and presentation.
- [`assets/FloatingScreen.bsml.txt`](assets/FloatingScreen.bsml.txt) — gameplay overlay template.
- [`assets/CustomList.bsml.txt`](assets/CustomList.bsml.txt) — `custom-list` with a per-item template and page buttons.

## 11. Source and scope

Canonical docs: <https://monkeymanboy.github.io/BSML-Docs/>. Tag index: <https://monkeymanboy.github.io/BSML-Docs/Tags/>. Macro index: <https://monkeymanboy.github.io/BSML-Docs/Macros/>. Source: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage>. BSMG wiki overview: <https://bsmg.wiki/modding/pc/bsml.html>.

This skill covers the PC game's in-game UI stack. Quest standalone uses a different BSML implementation; use `beatsaber-quest-modding` for that. ChroMapper uses CMUI, not BSML.

BSML is MIT licensed, Copyright (c) 2019 David L. This skill rewrites the docs and source behavior for agent consumption; it does not redistribute BSML binaries or source.
