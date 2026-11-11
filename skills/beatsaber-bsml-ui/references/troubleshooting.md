# Troubleshooting

BSML failures are usually one of four things: the resource was not embedded, a host member was not found, an attribute is not declared by a handler (and therefore silently ignored), or a value has the wrong type. Read the exception type first; it usually names the exact id or tag.

## 1. First checks

1. **Open the IPA console** (launch with `--verbose`) and find the first BSML exception, not the last one. A parse failure often cascades.
2. **Print the embedded resource names** in the mod assembly:

   ```csharp
   foreach (string name in Assembly.GetExecutingAssembly().GetManifestResourceNames())
       Plugin.Log.Info(name);
   ```

3. **Confirm the build action** is `EmbeddedResource`, not `Content`/`None`.
4. **Check the root namespace** and folder path, not just the file name.
5. **Check tag and attribute spelling** against [Tags](tags.md) and [Type handlers](type-handlers.md). Tag names are lowercase; attribute names are hyphenated and case-sensitive.
6. **Check the host member** for `[UIValue]`/`[UIAction]` or the exact member name.
7. **Bisect the template**: comment out half the XML, parse, repeat. A parse error names the element; a silent attribute problem does not.

## 2. Exception map

| Exception | Meaning | Fix |
| --- | --- | --- |
| `ResourceNotFoundException` | The assembly does not contain the resource name | Fix `EmbeddedResource`, `RootNamespace`, or the resource path |
| `TagNotFoundException` | Unknown XML tag | Use a listed alias; lowercase |
| `MacroNotFoundException` | Unknown `macro.*` | Use a listed macro; include the `macro.` prefix |
| `ValueNotFoundException` | `~id`, `value`, `options`, or macro host id not found | Add `[UIValue("id")]` or correct the id |
| `ActionNotFoundException` | `on-click`, `on-change`, `formatter`, etc. not found | Add `[UIAction]` or use the method name |
| `MissingAttributeException` | A settings tag is missing `options`, `tab-tag`, etc. | Add the required attribute |
| `TypeHandlerException` | A handler setter threw | The inner exception usually shows the bad value/type |
| `BSMLParserException` | A tag failed while being parsed | Read the element name/line and inner exception |
| `ParseException` | Bad bool/int/float/vector/color | Use invariant format and valid enum names |
| `XmlException` | Malformed XML | Close tags, escape `&`/`<`, fix attribute quotes |
| `InvalidOperationException` | Duplicate `[UIValue]`/`[UIAction]` id | Make ids unique |
| `InvalidCastException` | Settings/list value has the wrong type | Match the widget type exactly |
| `null` component / `NullReferenceException` | `[UIComponent]` used before parse | Use `[UIAction("#post-parse")]` |
| `UnityException` main-thread error | Parsing or UI access off the main thread | Move to the Unity main thread |
| `BSMLException` | A component-level BSML rule failed | Examples: two backgrounds, unknown background name |
| `ArgumentException` from `Enum.Parse` | Enum value typo/case | Use the exact C# enum name |

## 3. The UI is blank

| Check | Action |
| --- | --- |
| Is the view controller active? | `BSMLAutomaticViewController` parses on first `DidActivate` |
| Did the base `DidActivate` run? | Remove the override, or call `base.DidActivate(...)` |
| Is the template empty? | Add one root tag and one visible child |
| Is the root zero-sized? | Set `size-delta` or anchors |
| Is the root invisible? | Check `active`, alpha, and `bg` |
| Is there a parse error? | `BSMLViewController` shows `Invalid BSML`; read the log |
| Is it a settings menu? | Check the resource and `settings-container` root |
| Is it a gameplay tab? | Check `MenuType` and the tab visibility checkbox |
| Is it behind another canvas? | Check creation order and `sortingOrder` |
| Is it a modal? | Modals start hidden; emit `show-event` |

### "Invalid BSML" page

`BSMLViewController.ParseWithFallback` catches the exception and replaces the content with a message. The actual exception is in the log and in the page text. This means the game did not crash, but the view is not your template.

## 4. The UI is duplicated

- `DidActivate` ran more than once and the code created a new view each time.
- `firstActivation` was not checked.
- A `main-left-screen`-style view was refreshed without clearing its old content.
- A `FloatingScreen` was created on every gameplay event, not once per scene.

Fix: create once, guard with `firstActivation`, and destroy on the matching deactivate/scene-exit event.

## 5. Buttons and clicks

| Symptom | Cause | Fix |
| --- | --- | --- |
| Button does nothing | `on-click` id not found | Match `[UIAction]`; check the log for `ActionNotFoundException` |
| Button does nothing | Method is on a different host | Put the action on the actual host or use `macro.as-host` |
| Button does nothing | Button is behind another raycast target | Check sibling order and `raycast-target` |
| `click-event` does nothing | No handler subscribed | Add `[UIAction("#event-name")]` |
| Modal does not open | `show-event` mismatch | Match `click-event` and `show-event` exactly |
| Page button does nothing | Wrong list id | Use `<id>#PageUp` / `<id>#PageDown` |
| Custom-list button does nothing | Action is on the screen host, not the item | Define it on the item host |
| Click works but no sound | Custom `ClickableImage`/`ClickableText` bypasses button audio | Use a real `button` when game audio matters |

## 6. Settings problems

| Symptom | Cause | Fix |
| --- | --- | --- |
| Menu missing | Registered before main menu, duplicate name, or resource not found | Use `MainMenuAwaiter`, unique name, check resource |
| Menu is blank | Root is not a settings container, or resource empty | Use `<settings-container>` |
| `ValueNotFoundException` | `value` id missing or host member not exposed | Add `[UIValue]`; check `[HostOptions]` |
| Slider throws | `int` vs `float` mismatch | Use `integer-only="true"` with an `int` |
| Dropdown blank | `options` not `IList` or value type mismatch | Use `List<string>` + `string`, etc. |
| Edits vanish | `apply-on-change` false and no OK | Enable apply-on-change or press OK |
| Edits revert on OK | Wrote to a temporary object, not the config | Write to the config in the property setter |
| Widget does not update | Field, no `INotifyPropertyChanged`, or `bind-value` false | Fix all three |
| Game restarts on OK | BSML settings behavior | Expected; persist before OK |
| Submenu back does nothing | Used outside a BSML settings flow | Use `settings-submenu` inside `AddSettingsMenu` |
| Two menus with the same name | Duplicate name ignored | Use a unique name |

## 7. Lists and scrolling

| Symptom | Cause | Fix |
| --- | --- | --- |
| `InvalidCastException` | `list` data is not `IList<CustomCellInfo>` | Use the exact type |
| Empty `custom-list` | `contents` missing/not `IList` | Add `contents` and `[UIValue]` |
| Same row repeated | Template bound to the outer host | Use `~` on item members |
| List does not update | No `ReloadData()` | Call `TableView.ReloadData()` |
| Zero-height list | Missing `cell-size`/`visible-cells` | Set both |
| Scrollbar missing | Horizontal list or no `id` | Vertical lists only; add `id` |
| Scrolled content clips | No content height | Add a vertical layout and `pref-height` |
| Page buttons scroll with content | Buttons inside `scrollable-container` | Place them outside and use tags |

## 8. Images and text

| Symptom | Cause | Fix |
| --- | --- | --- |
| Image blank | Wrong resource or `#Sprite` name | Check the log; print resource names |
| Image stretched | `preserve-aspect` false | Set `preserve-aspect="true"` |
| Image never loads | URL blocked/offline | Check the log; use a local/embedded fallback |
| Animated image static | Using `raw-image`, or wrong extension | Use `image` and `.gif`/`.apng` |
| Text too large/small | `font-size` is game units | Use 4-6 for body text |
| Text does not wrap | `word-wrapping` false or no width | Enable wrapping and set `pref-width` |
| Rich text shows tags | Not enabled or not escaped | `rich-text="true"`, escape `<`/`>` |
| Localized text blank | Key missing | Check the key; use `text` temporarily |
| Hover hint missing | No `HoverHintController` | Use a BSML screen/floating screen |

## 9. Hot reload and lifecycle

| Symptom | Cause | Fix |
| --- | --- | --- |
| Hot reload does nothing | Release build, or no `[HotReload]` | Build Debug or define `USE_HOT_RELOAD` |
| Hot reload does nothing | Editing a different file/path | Match `RelativePathToLayout`; open the screen |
| View parses twice | Manual parse plus base parse | Do not call `Parse` in a BSML view controller |
| Settings parsed before menu | Registered in `OnApplicationStart` | Use `MainMenuAwaiter` |
| Gameplay tab not visible | `MenuType` mismatch or hidden by user | Use the right flags; check the eye toggle |
| Menu button missing | Registered before `MenuButtons` exists, or duplicate text | Register after main menu; unique text |
| Floating screen survives scene change | Not destroyed on gameplay exit | Destroy on scene exit |
| Mod works once, then stops | Static event subscribed multiple times | Unsubscribe or make registration idempotent |

## 10. Debug checklist

```text
[ ] Resource embedded and name printed
[ ] Root tag and every tag name are valid
[ ] Every attribute is declared by a type handler
[ ] Every value/options id has [UIValue]
[ ] Every on-click/on-change/formatter has [UIAction]
[ ] [UIComponent] access is in #post-parse
[ ] Value types match the widget
[ ] No duplicate menu/tab/button names
[ ] Called from the mod assembly, not a helper
[ ] UI created after the main menu
[ ] View created only on first activation
[ ] Floating screen destroyed on scene exit
```

## 11. Source

- `BSMLParser` exception wrapping: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/BSMLParser.cs>
- `BSMLViewController` fallback: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/ViewControllers/BSMLViewController.cs>
- `SettingsMenu` error page: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Settings/SettingsMenu.cs>
- `GameplaySetupMenu` error page: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/GameplaySetup/GameplaySetupMenu.cs>
- Exception types: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/tree/master/BeatSaberMarkupLanguage/Exceptions>
