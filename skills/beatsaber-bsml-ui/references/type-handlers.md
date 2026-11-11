# Type handlers and attributes

A type handler declares which attributes a component accepts. BSML applies a handler to **every component of that type on the created GameObject**, including components exposed through `ExternalComponents`. This is the authoritative alias list for BSML 1.14.2.

The docs site generates per-component pages from the same metadata. If this file and the installed source disagree, the installed source wins.

Source: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/tree/master/BeatSaberMarkupLanguage/TypeHandlers> · Docs: <https://monkeymanboy.github.io/BSML-Docs/Tags/>

## 1. How to read this file

- **Attribute** is the preferred spelling. **Aliases** are alternatives; use one, not both.
- **Type** is the parser type, not necessarily the C# type. `UIAction` means a method name or `[UIAction]` id. `UIValue` means a member name or `[UIValue]` id. `event` is a comma-separated event name list.
- `~value-id` can replace the value of any attribute. For a property on an `INotifyPropertyChanged` host, normal type handlers re-apply the value when the property changes. Settings need `bind-value="true"`.
- Unknown attributes are ignored. There is no error.
- If two attributes target the same underlying property (for example `font-color` and `color`), the last one applied wins. Use one.

## 2. RectTransform

Every UI object has one. These attributes control position, size, anchors, and hover hints.

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `anchor-min` | — | Vector2 | Lower-left anchor, 0-1 of parent |
| `anchor-min-x` | — | float | X component only |
| `anchor-min-y` | — | float | Y component only |
| `anchor-max` | — | Vector2 | Upper-right anchor, 0-1 of parent |
| `anchor-max-x` | — | float | X component only |
| `anchor-max-y` | — | float | Y component only |
| `anchored-position` | — | Vector2 | Pivot position relative to anchors, in game units |
| `anchored-position-x` | `anchor-pos-x` | float | X only |
| `anchored-position-y` | `anchor-pos-y` | float | Y only |
| `size-delta` | — | Vector2 | Size added to the anchor rectangle |
| `size-delta-x` | — | float | Width delta |
| `size-delta-y` | — | float | Height delta |
| `pivot` | — | Vector2 | Rotation/position origin, 0-1 |
| `pivot-x` | — | float | X only |
| `pivot-y` | — | float | Y only |
| `local-scale` | `scale` | Vector3 | Local scale; two values use Z = 1 |
| `active` | — | bool | SetActive on the GameObject |
| `name` | — | string | GameObject name |
| `hover-hint` | — | string | Plain hover text |
| `hover-hint-key` | — | localization key | Localized hover text, resolved once |

`active` is applied at parse time. With `active="~property"` and an `INotifyPropertyChanged` host, it updates when the property changes.

## 3. Layout

### LayoutElement

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `preferred-width` | `pref-width` | float | Preferred width before extra space |
| `preferred-height` | `pref-height` | float | Preferred height |
| `min-width` | — | float | Minimum width |
| `min-height` | — | float | Minimum height |
| `flexible-width` | — | float | Share of extra width |
| `flexible-height` | — | float | Share of extra height |
| `ignore-layout` | — | bool | Exclude from the parent layout |

`pref-*` only has an effect when a layout group or `ContentSizeFitter` on the parent uses it. On a plain `bg`, use `size-delta`.

### LayoutGroup

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `pad` | `padding` | 1-4 ints | Padding; prefer `pad-*` for unequal sides |
| `pad-top` | — | int | Top padding |
| `pad-bottom` | — | int | Bottom padding |
| `pad-left` | — | int | Left padding |
| `pad-right` | — | int | Right padding |
| `child-align` | `child-alignment` | TextAnchor | `UpperLeft`, `MiddleCenter`, `LowerCenter`, etc. |

### HorizontalOrVerticalLayoutGroup

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `spacing` | — | float | Space between children |
| `child-control-width` | — | bool | Layout controls child width |
| `child-control-height` | — | bool | Layout controls child height |
| `child-expand-width` | — | bool | Force children to fill extra width |
| `child-expand-height` | — | bool | Force children to fill extra height |

### GridLayoutGroup

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `cell-size` | — | Vector2 | Cell size |
| `cell-size-x` | — | float | Cell width |
| `cell-size-y` | — | float | Cell height |
| `spacing` | — | Vector2 | Cell spacing |
| `spacing-x` | — | float | Horizontal spacing |
| `spacing-y` | — | float | Vertical spacing |

### ContentSizeFitter

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `horizontal-fit` | — | `FitMode` | `Unconstrained`, `MinSize`, `PreferredSize` |
| `vertical-fit` | — | `FitMode` | Same |

The `vertical` tag sets `horizontal-fit="PreferredSize"` and leaves vertical unconstrained. The `horizontal` tag sets `vertical-fit="PreferredSize"`. Set the opposite fit explicitly when you want to fill the parent.

## 4. Background, glow, stroke, graphics

### Backgroundable

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `background` | `bg` | background name | `round-rect-panel`, `panel-top`, `panel-fade-gradient`, `panel-top-gradient`, `title-gradient` |
| `background-color` | `bg-color` | Color | Solid color |
| `background-color0` | `bg-color0` | Color | Gradient start |
| `background-color1` | `bg-color1` | Color | Gradient end |
| `background-gradient` | — | bool | Enable gradient |
| `background-alpha` | `bg-alpha` | float | Opacity |

`background` can only be applied once per object; adding two backgrounds throws. The background templates come from the game, so the name list is fixed.

### Glowable

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `glow-color` | — | Color or `none` | Set or disable the glow |

### Strokable

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `stroke-color` | — | Color | Stroke color |
| `stroke-type` | — | `None`, `Clean`, `Regular` | Stroke sprite style |

### Graphic

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `raycast-target` | `raycast` | bool | Whether the graphic receives pointer raycasts |
| `raycast-padding` | — | Vector4 | Raycast padding, left/bottom/right/top |

### Selectable

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `interactable` | — | bool | Enable/disable buttons, toggles, sliders |

## 5. Text

### TextMeshProUGUI

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `text` | — | string | Displayed text |
| `font-size` | — | float | Game units; 4 is the small default, 6-10 for headers |
| `font-size-min` | — | float | Auto-size lower bound |
| `font-size-max` | — | float | Auto-size upper bound |
| `enable-auto-sizing` | — | bool | Enable TMP auto sizing |
| `font-color` | `color` | Color | Text color |
| `face-color` | — | Color | Face color |
| `outline-color` | — | Color | Outline color; not supported by all fonts |
| `outline-width` | — | float | Outline width |
| `rich-text` | — | bool | Enable TMP rich text |
| `font-align` | `align` | TextAlignmentOptions | `Center`, `Midline`, `MidlineLeft`, `Left`, `Right`, ... |
| `overflow-mode` | — | TextOverflowModes | `Overflow`, `Ellipsis`, `Masking`, `Truncate`, ... |
| `word-wrapping` | — | bool | Wrap at word boundaries |
| `bold` | — | bool | Bold style |
| `italics` | — | bool | Italic style |
| `underlined` | — | bool | Underline style |
| `strikethrough` | — | bool | Strikethrough style |
| `all-uppercase` | — | bool | Uppercase style |
| `line-spacing` | — | float | Line spacing |
| `line-spacing-adjustment` | — | float | Line spacing adjustment |
| `paragraph-spacing` | — | float | Paragraph spacing |
| `monochrome` | — | bool | Use the monochrome font instead of the main font |

`font-size` is not pixels. Beat Saber UI uses game units; values around 4-6 are normal, and 10 is large.

### FormattableText

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `data` | — | UIValue(object) | Data object to format |
| `data-format` | — | string | `IFormattable` format string, for example `0,0` |
| `data-formatter` | — | UIValue(ICustomFormatter) | Custom formatter object |

`data` and `data-format` are useful for numbers without rebuilding the text in code:

```xml
<text data="score" data-format="0,0"/>
```

`data` is live when the source is a property and the host raises `PropertyChanged`.

### LocalizedTextMeshProUGUI

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `text-key` | — | localization key | Key such as `BUTTON_OK`; enables localization on the text |
| `maintain-text-alignment` | — | bool | Keep alignment across RTL/LTR languages |

Use either `text` or `text-key`, not both. `text-key` turns the `LocalizedTextMeshProUGUI` component on and lets the game language change the text at runtime.

### TextPageScrollView

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `text` | — | string | Body text for `text-page` |

## 6. Images and buttons

### Image

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `src` | `source` | resource path | Sprite source |
| `preserve-aspect` | — | bool | Keep aspect ratio |
| `image-color` | `img-color` | Color | Tint |

`src` accepts `#GameSprite`, a URL, a file path, or an embedded resource (optionally `AssemblyName:path`). Animated GIF/APNG sources are supported.

### RawImage

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `src` | `source` | resource path | Texture source; `#GameTexture` for a game texture |

### Button

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `on-click` | — | UIAction | Invoke on click |
| `click-event` | `event-click` | event | Emit an event on click |

`button` also accepts `interactable` (Selectable), `text`/`text-key` and text styling (the label is an external component), and layout/rect attributes.

### ButtonIconImage

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `icon` | — | resource path or UIValue(Sprite) | Icon Sprite; `#GameSprite` works, and a `~` UIValue may return a `Sprite` directly |
| `icon-skew` | — | float | Horizontal skew amount |
| `show-underline` | — | bool | Show the button underline |

### ButtonArtworkImage

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `artwork` | `art`, `bg-artwork`, `bg-art` | resource path | Background artwork Sprite |

### ClickableImage

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `on-click` | — | UIAction | Invoke on click |
| `click-event` | `event-click` | event | Emit on click |
| `default-color` | — | Color | Normal tint |
| `highlight-color` | — | Color | Hover tint |

### ClickableText

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `on-click` | — | UIAction | Invoke on click |
| `click-event` | `event-click` | event | Emit on click |
| `default-color` | — | Color | Normal color |
| `highlight-color` | — | Color | Hover color |

### PageButton

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `direction` | `dir` | `Up`, `Down`, `Left`, `Right` | Arrow orientation and default size |

## 7. Settings

Settings tags combine a `GenericSetting` handler with tag-specific handlers. See [Settings](settings.md) for usage.

### GenericSetting

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `value` | — | UIValue | Two-way value |
| `apply-on-change` | — | bool | Write to the host immediately |
| `bind-value` | — | bool | Re-read the widget when the host property changes |
| `on-change` | — | UIAction | Callback with the new value |
| `formatter` | — | UIAction | Return a display string |
| `get-event` | — | event | Event that reads host -> widget; default `cancel` |
| `set-event` | — | event | Event that writes widget -> host; default `apply` |

### GenericInteractableSetting

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `interactable` | — | bool | Enable/disable the control |

### IncrementSetting

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `min` | — | int/float | Minimum |
| `max` | — | int/float | Maximum |
| `increment` | — | int/float | Step |
| `integer-only` | — | bool | Use int instead of float |

### SliderSetting

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `min` | — | int/float | Minimum |
| `max` | — | int/float | Maximum |
| `increment` | — | int/float | Step; also sets the number of slider steps |
| `integer-only` | — | bool | Use int instead of float |
| `show-buttons` | — | bool | Show +/- buttons beside the slider |

### ListSetting

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `options` | `choices` | UIValue(IList) | Choices; required |

### ListSliderSetting

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `options` | `choices` | UIValue(IList) | Choices; required |
| `show-buttons` | — | bool | Show +/- buttons |

### DropDownListSetting

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `options` | `choices` | UIValue(IList) | Choices; required |

## 8. Lists and tables

### CustomListTableData

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `data` | `content` | UIValue(IList<CustomCellInfo>) | Rows; required for content |
| `select-cell` | — | UIAction<TableView, int> | Row selected |
| `list-style` | — | `List`, `Box`, `Simple` | Cell style |
| `cell-size` | — | float | Row height/size |
| `visible-cells` | — | float | Rows visible; sets preferred size |
| `list-width` | — | float | Width for a vertical list |
| `list-height` | — | float | Height for a horizontal list |
| `list-direction` | — | `Vertical`, `Horizontal` | Table direction |
| `expand-cell` | — | bool | Allow wider text in `List` style |
| `align-to-center` | — | bool | Center rows when there are few |
| `show-scrollbar` | — | bool | Vertical lists only |
| `id` | — | string | Registers `<id>#PageUp` / `<id>#PageDown` events |

### CustomCellListTableData

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `contents` | `data` | UIValue(IList) | Item hosts; required |
| `select-cell` | — | UIAction<TableView, object> | Item selected |
| `cell-size` | — | float | Cell size |
| `visible-cells` | — | float | Cells visible |
| `list-width` | — | float | Width for a vertical list |
| `list-height` | — | float | Height for a horizontal list |
| `list-direction` | — | `Vertical`, `Horizontal` | Table direction |
| `clickable-cells` | — | bool | Allow cell selection |
| `align-to-center` | — | bool | Center cells |
| `show-scrollbar` | — | bool | Vertical lists only |
| `id` | — | string | Registers page events |
| `_children` | — | inner XML | Internal: the cell template captured from the tag body |

The `_children` entry is not written by hand. It is how `<custom-list>...</custom-list>` content becomes a template.

## 9. Tabs and segmented controls

### Tab

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `tab-name` | — | string | Visible tab name |
| `tab-name-key` | — | localization key | Localized tab name |

A tab also needs `tags` matching the selector's `tab-tag`.

### TabSelector

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `tab-tag` | — | string | Required; matches tab `tags` |
| `page-count` | — | int | Tabs per page |
| `left-button-tag` | — | string | Tag of the left page button |
| `right-button-tag` | — | string | Tag of the right page button |

### IconSegmentedControl

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `contents` | `data` | UIValue(List<IconSegmentedControl.DataItem>) | Icons |
| `select-cell` | — | UIAction<SegmentedControl, int> | Selection |

### TextSegmentedControl

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `contents` | `data` | UIValue(IEnumerable) | Items; converted with `ToString()` |
| `select-cell` | — | UIAction<SegmentedControl, int> | Selection |

## 10. Modals

### ModalView

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `show-event` | — | event | Show when emitted |
| `hide-event` | — | event | Hide when emitted |
| `click-off-closes` | `clickerino-offerino-closerino` | bool | Dismiss on outside click |
| `move-to-center` | — | bool | Center on the current screen |

### ModalKeyboard

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `show-event` | — | event | Reload the value and show |
| `value` | — | UIValue(string) | Text value |
| `on-enter` | — | UIAction<string> | Enter pressed |
| `clear-on-open` | — | bool | Clear the field when opening |

`modal-keyboard` also accepts the `ModalView` attributes.

### ModalColorPicker

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `value` | — | UIValue(Color) | Color value |
| `on-done` | — | UIAction<Color> | Done pressed |
| `on-cancel` | — | UIAction | Cancel pressed |
| `color-change` | — | UIAction<Color> | Live color change |

`modal-color-picker` also accepts the `ModalView` attributes.

## 11. Scrolling

### BSMLScrollableContainer

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `id` | — | string | Registers page events and links tagged controls |
| `mask-overflow` | — | bool | Allow content outside the mask |
| `align-bottom` | — | bool | Start aligned to the bottom |
| `scroll-to-bottom-on-update` | — | bool | Follow new content |

### BSMLScrollIndicator

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `handle-color` | — | Color | Scrollbar handle color |
| `handle-image` | — | resource path | Scrollbar handle Sprite |

## 12. Leaderboard

### LeaderboardTableView

| Attribute | Aliases | Type | Notes |
| --- | --- | --- | --- |
| `cell-size` | — | float | Row height |

The `leaderboard` tag creates the table but does not fill it. Get the component with `[UIComponent]` and call the game API for scores.

## 13. Common type mistakes

| Symptom | Cause | Fix |
| --- | --- | --- |
| `font-size` does nothing on a button | The button tag's label is an external component; the handler still applies | Check the value and the button prefab; it should work on `TextMeshProUGUI` |
| `bg` on a `button` does nothing | `button` has no `Backgroundable` | Wrap it in `<bg>`; `primary-button` changes the prefab but still has no `Backgroundable` |
| `text-key` and `text` both set | Both handlers write the label | Use only one |
| `pref-width` does nothing | No parent layout group or fitter | Use `size-delta` or add a layout group |
| `pad` with four values looks wrong | Multi-value padding is easy to misread | Use `pad-top`/`pad-bottom`/`pad-left`/`pad-right` |
| Enum value throws | Case or name mismatch | Use the exact C# enum name |
| `~property` is stale | Host does not raise `PropertyChanged`, or value is a field | Implement `INotifyPropertyChanged`, use a property |
