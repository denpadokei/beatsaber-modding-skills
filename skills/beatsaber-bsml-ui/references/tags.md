# Tags

A tag is a short XML name that creates a GameObject with a fixed set of components. Attributes are then applied by [type handlers](type-handlers.md). This file lists every tag shipped by BSML 1.14.2, its aliases, the components it creates, and the attributes that matter most.

Tag index: <https://monkeymanboy.github.io/BSML-Docs/Tags/> · Source: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/tree/master/BeatSaberMarkupLanguage/Tags>

## 1. Containers and layout

| Tag (aliases) | Creates | Key attributes | Use for |
| --- | --- | --- | --- |
| `bg` (`background`, `div`) | Backgroundable, ContentSizeFitter, RectTransform | `bg`, `bg-color`, `bg-color0`, `bg-color1`, `bg-alpha`, `background-gradient`, `size-delta`, `anchor-*`, `pad*` | Root panel, card, tinted background |
| `vertical` | VerticalLayoutGroup, ContentSizeFitter, Backgroundable, LayoutElement | `spacing`, `child-control-height`, `child-control-width`, `child-expand-height`, `child-expand-width`, `child-align`, `pad*`, `pref-width`, `pref-height` | Stacked rows |
| `horizontal` | HorizontalLayoutGroup, ContentSizeFitter, Backgroundable, LayoutElement | Same as `vertical` | Row of controls |
| `grid` | GridLayoutGroup, ContentSizeFitter, Backgroundable | `cell-size`, `cell-size-x`, `cell-size-y`, `spacing`, `spacing-x`, `spacing-y` | Uniform cells |
| `stack` | StackLayoutGroup, ContentSizeFitter, Backgroundable, LayoutElement | Layout attributes | Overlapping/stacked content |
| `scrollable-container` | BSMLScrollableContainer, layout, fitter | `id`, `mask-overflow`, `align-bottom`, `scroll-to-bottom-on-update` | Custom scroll area |
| `scroll-view` | BSMLScrollView (game scroll view), content layout | `size-delta`, `anchor-*`, `pref-*` | Long page content with page buttons |
| `settings-container` (`settings-scroll-view`, `scrollable-settings-container`) | Scrollable settings view | `size-delta`, `anchor-*`, child layout | Root of a settings page |
| `tab` | Tab, Backgroundable, ContentSizeFitter | `tab-name`, `tab-name-key`, `tags` | A page controlled by a tab selector |
| `tab-selector` (`tab-select`) | TabSelector, TextSegmentedControl | `tab-tag`, `page-count`, `left-button-tag`, `right-button-tag` | Tab bar |
| `page-button` (`pg-button`) | PageButton, ButtonIconImage | `direction` (`Up`/`Down`/`Left`/`Right`), `click-event`, `pref-width`, `pref-height` | Page a list or scroll view |
| `horizontal`/`vertical` nesting | — | — | Build rows of columns, etc. |

`bg` background names are limited to the game's templates: `round-rect-panel`, `panel-top`, `panel-fade-gradient`, `panel-top-gradient`, `title-gradient`. There is no arbitrary sprite background; use `<image>` or a custom tag for that.

## 2. Text, images, buttons

| Tag (aliases) | Creates | Key attributes | Use for |
| --- | --- | --- | --- |
| `text` (`label`) | FormattableText, TextMeshProUGUI, LocalizedTextMeshProUGUI | `text`, `text-key`, `data`, `data-format`, `data-formatter`, `font-size`, `align`, `color`, `rich-text`, `word-wrapping`, `overflow-mode`, `bold`, `italics`, `underlined` | Labels, bound values |
| `button` | Button, TextMeshProUGUI label, LocalizedTextMeshProUGUI, layout | `text`, `text-key`, `on-click`, `click-event`, `interactable`, `font-size`, `align`, `pref-width`, `pref-height` | Action button |
| `primary-button` (`action-button`) | Game primary button + label | Same as `button` | Emphasized action |
| `icon-button` (`button-with-icon`) | Button, ButtonIconImage, layout | `icon`, `icon-skew`, `show-underline`, `on-click`, `click-event`, `interactable`, `pref-width`, `pref-height` | Icon-only action |
| `clickable-text` | ClickableText, TextMeshProUGUI, LocalizedTextMeshProUGUI | `text`, `text-key`, `on-click`, `click-event`, `highlight-color`, `default-color` | Link-like text |
| `clickable-image` | ClickableImage (ImageView) | `src`, `on-click`, `click-event`, `highlight-color`, `default-color`, `pref-width`, `pref-height` | Icon button without a button prefab |
| `image` (`img`) | Image, LayoutElement | `src`, `preserve-aspect`, `image-color`, `pref-width`, `pref-height` | Static sprite |
| `raw-image` | RawImage, LayoutElement | `src`, `pref-width`, `pref-height` | Texture, not Sprite |
| `text-page` | TextPageScrollView + text | `text`, `text-key`, `size-delta` | Long, scrollable text |
| `loading` (`loading-indicator`) | Game loading indicator | Layout attributes | Busy indicator |

`button` and `primary-button` expose their label through `ExternalComponents`. `<button text="Play"/>`, `font-size`, `align`, and `[UIComponent] TextMeshProUGUI` all target the label, not the button root. `icon-button` deletes its text child, so `text` does nothing there.

`image`/`clickable-image` `src` accepts:

- `#SpriteName` — a Sprite already loaded by the game, for example `#OneLifeIcon`.
- `https://...` — downloaded at runtime.
- an absolute or relative file path.
- an embedded resource, optionally prefixed with `AssemblyName:`.

`raw-image` uses `#TextureName` for game textures. See [Styling and assets](styling-and-assets.md).

## 3. Settings tags

These are covered in depth in [Settings](settings.md).

| Tag (aliases) | Value type | Key attributes |
| --- | --- | --- |
| `toggle-setting` (`bool-setting`, `checkbox-setting`, `checkbox`) | `bool` | `text`, `value`, `apply-on-change`, `bind-value`, `on-change` |
| `slider-setting` | `float` or `int` | `text`, `value`, `min`, `max`, `increment`, `integer-only`, `show-buttons` |
| `increment-setting` | `float` or `int` | `text`, `value`, `min`, `max`, `increment`, `integer-only` |
| `list-setting` | element of `options` | `text`, `value`, `options`, `formatter` |
| `list-slider-setting` | element of `options` | `text`, `value`, `options`, `show-buttons` |
| `dropdown-list-setting` | element of `options` | `text`, `value`, `options` |
| `string-setting` | `string` | `text`, `value`, `apply-on-change`, `formatter` |
| `color-setting` | `UnityEngine.Color` | `text`, `value`, `on-done`, `on-cancel`, `color-change` |
| `settings-submenu` | — | `text`, `text-key`, `hover-hint`; content is usually a `settings-container` |

All setting tags also accept `interactable="false"` to disable the control.

## 4. Lists, tables, and selections

| Tag (aliases) | Data | Key attributes | Use for |
| --- | --- | --- | --- |
| `list` | `IList<CustomListTableData.CustomCellInfo>` | `data`, `select-cell`, `list-style`, `cell-size`, `visible-cells`, `list-width`, `list-height`, `list-direction`, `expand-cell`, `show-scrollbar`, `align-to-center`, `id` | Standard song-list-style rows |
| `custom-list` | `IList<object>` (your item type) | `contents`/`data`, `select-cell`, `cell-size`, `visible-cells`, `list-width`, `list-height`, `list-direction`, `clickable-cells`, `align-to-center`, `show-scrollbar`, `id` | Per-item template |
| `text-segments` | `IEnumerable` of strings | `contents`/`data`, `select-cell` | Text segmented control |
| `icon-segments` | `List<IconSegmentedControl.DataItem>` | `contents`/`data`, `select-cell` | Icon segmented control |
| `vertical-icon-segments` | `List<IconSegmentedControl.DataItem>` | `contents`/`data`, `select-cell` | Vertical icon control |
| `leaderboard` | Populated in code | `cell-size` | Leaderboard table |

### `list`

`data` must be an `IList<CustomListTableData.CustomCellInfo>` exactly (not `List<object>`).

```csharp
[UIComponent("song-list")] private CustomListTableData songList;

[UIValue("songs")]
public List<CustomListTableData.CustomCellInfo> Songs { get; } = new()
{
    new("Song A", "Artist A"),
    new("Song B", "Artist B"),
};

[UIAction("select-song")]
private void SelectSong(TableView table, int index) =>
    Plugin.Log.Info($"Selected {Songs[index].Text}");

[UIAction("#post-parse")]
private void PostParse() => songList.TableView.ReloadData();
```

```xml
<list id="song-list" data="songs" select-cell="select-song"
      list-style="List" visible-cells="5" cell-size="8.5" show-scrollbar="true"/>
```

- `list-style`: `List` (song row, 8.5), `Box` (cover grid), `Simple` (plain text, 8).
- `select-cell` receives `(TableView, int)`.
- `show-scrollbar` only works for vertical lists.
- To refresh after mutating the collection: `songList.Data = newList; songList.TableView.ReloadData();`

### `custom-list`

`custom-list` children are **not** parsed as children of the list. They become a cell template, parsed once per item with the item as host.

```xml
<custom-list id="mod-list" contents="mods" select-cell="select-mod"
             cell-size="10" visible-cells="4" list-width="60">
  <horizontal child-expand-width="false" pad="1">
    <text text="~name" align="MidlineLeft" font-size="4"/>
    <button text="Select" on-click="select-current"/>
  </horizontal>
</custom-list>
```

- `data`/`contents` must be `IList` of your item objects.
- `select-cell` receives `(TableView, object)` where the object is the item.
- `clickable-cells="false"` disables cell selection.
- Each cell host can have `[UIValue]` members (`name` above) or public members addressed by name.
- Actions inside the template (`on-click`, `on-change`) resolve against the **item** host, not the outer settings host. Put the action on the item type, or use `macro.as-host` to reach another object.
- `tags="selected"`, `tags="hovered"`, `tags="un-selected-un-hovered"` mark visual-state objects; `[UIAction("refresh-visuals")]` receives `(bool selected, bool highlighted)`.
- The cell template is wrapped in `<bg>` by BSML; your root is a child of that.

Page buttons:

```xml
<page-button direction="Up" click-event="mod-list#PageUp" pref-width="4" pref-height="4"/>
<custom-list id="mod-list" .../>
<page-button direction="Down" click-event="mod-list#PageDown" pref-width="4" pref-height="4"/>
```

The list's `id` registers `<id>#PageUp` and `<id>#PageDown` events.

## 5. Scroll views

### `scroll-view`

Uses the game's `TextPageScrollView`. It already includes page buttons and a scroll indicator. Children go into a vertical content layout.

```xml
<scroll-view pref-height="60">
  <vertical spacing="1">
    <text text="First"/>
    <text text="Second"/>
  </vertical>
</scroll-view>
```

### `scrollable-container`

A custom scroll area. It supports tags for its controls:

```xml
<vertical>
  <page-button tags="PageUpFor:log" direction="Up" pref-width="4" pref-height="4"/>
  <scrollable-container id="log" align-bottom="true" size-delta="0 -4">
    <vertical>
      <text text="Line 1"/>
      <text text="Line 2" tags="ScrollFocus"/>
    </vertical>
  </scrollable-container>
  <page-button tags="PageDownFor:log" direction="Down" pref-width="4" pref-height="4"/>
  <scroll-indicator tags="IndicatorFor:log"/>
</vertical>
```

- `mask-overflow="false"` lets content extend beyond the mask.
- `align-bottom="true"` starts at the bottom; useful for logs.
- `scroll-to-bottom-on-update="true"` follows new content.
- `tags="ScrollFocus"` makes an item participate in focus scrolling.
- Page buttons and the indicator are linked by the `PageUpFor:<id>`, `PageDownFor:<id>`, and `IndicatorFor:<id>` tags.

### `settings-container`

An alias of the scrollable settings view. It is the required root for a normal settings menu. Do not treat it as a plain panel: it creates a `TextPageScrollView` and content container.

## 6. Tabs

```xml
<tab-selector tab-tag="settings-tab" page-count="3"/>
<tab tags="settings-tab" tab-name="General">
  <settings-container>...</settings-container>
</tab>
<tab tags="settings-tab" tab-name="Advanced">
  <settings-container>...</settings-container>
</tab>
```

- `tab-selector` requires `tab-tag`.
- Each `tab` needs `tags` containing that same value, plus `tab-name` or `tab-name-key`.
- `page-count` limits how many tabs are visible per page; use `left-button-tag` / `right-button-tag` to point at page buttons.
- The selector sets itself up on `post-parse`, so it can appear before or after the tabs in the XML.

## 7. Modals

```xml
<button text="Rename" click-event="open-rename"/>
<modal id="rename" show-event="open-rename" hide-event="close-rename"
       click-off-closes="true" move-to-center="true" size-delta="50 25">
  <vertical spacing="1" pad="2">
    <text text="New name"/>
    <string-setting text="Name" value="new-name" apply-on-change="true"/>
    <button text="Close" click-event="close-rename"/>
  </vertical>
</modal>
```

- `modal` starts hidden. It appears when `show-event` fires and hides on `hide-event`.
- `click-off-closes="true"` lets the player dismiss by clicking outside.
- `move-to-center="true"` centers it on the current screen.
- `modal-keyboard` is a modal plus a QWERTY keyboard. Key attributes: `value` (string), `on-enter`, `clear-on-open`, `show-event`.
- `modal-color-picker` is a modal plus the game color picker. Key attributes: `value` (Color), `on-done`, `on-cancel`, `color-change`.

```xml
<modal-keyboard show-event="open-keyboard" value="input" on-enter="enter-text"
                clear-on-open="true" click-off-closes="true"/>
<modal-color-picker show-event="open-color" value="chosen-color"
                    on-done="color-done" on-cancel="color-cancel"/>
```

`on-enter` receives the string. `on-done` and `on-cancel` receive the `Color`. `color-change` fires while the picker is open.

## 8. Gameplay and special tags

| Tag | Use |
| --- | --- |
| `modifier-container` | Vertical container for gameplay modifiers |
| `modifier` | A modifier toggle; `source="#IconName"`, `text`, `value` (bool), `apply-on-change` |
| `loading` | Loading indicator |
| `leaderboard` | Game leaderboard table; populate through `[UIComponent]` |
| `text-page` | Long text page |

`modifier` is a `ToggleSetting`; `value` must be `bool`. It is intended for the gameplay setup screen, not for arbitrary settings lists.

## 9. Root templates

`bg` root:

```xml
<bg size-delta="0 -10" anchored-position="0 -5">
  <vertical child-control-height="false" spacing="2" pad="2">
    ...
  </vertical>
</bg>
```

`settings-container` root:

```xml
<settings-container>
  <vertical child-control-height="false" spacing="1" pad="2">
    ...
  </vertical>
</settings-container>
```

A gameplay tab root is often `bg` or `vertical`; a flow-coordinator view root is usually `bg`. A modal root is `modal`.

## 10. Source

- Tag sources: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/tree/master/BeatSaberMarkupLanguage/Tags>
- Tag index: <https://monkeymanboy.github.io/BSML-Docs/Tags/>
- `ListTag`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Tags/ListTag.cs>
- `CustomListTag`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Tags/CustomListTag.cs>
- `ScrollableContainerTag`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Tags/ScrollableContainerTag.cs>
- `SettingsContainerTag` (the `settings-container` alias lives in `ScrollableSettingsContainerTag`): <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Tags/ScrollableSettingsContainerTag.cs>
