# Lists and scrolling

BSML has two list implementations and three scroll containers. They are not interchangeable: `list` is a fixed row model, `custom-list` parses a template per item, `scroll-view` is the game's text page scroll view, `scrollable-container` is a custom scroll area, and `settings-container` is a scroll view specialized for settings pages.

Tag index: <https://monkeymanboy.github.io/BSML-Docs/Tags/ListTag/> · Source: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/tree/master/BeatSaberMarkupLanguage/Components>

## 1. Which list?

| Need | Use | Data type |
| --- | --- | --- |
| Song-list style rows with title, subtitle, optional icon | `list` | `IList<CustomListTableData.CustomCellInfo>` |
| A completely custom cell layout | `custom-list` | `IList` of your item objects |
| Plain text rows only | `list` with `list-style="Simple"` | `IList<CustomListTableData.CustomCellInfo>` |
| Cover grid | `list` with `list-style="Box"` | `IList<CustomListTableData.CustomCellInfo>` |

Use `list` whenever `CustomCellInfo` is enough. Use `custom-list` when each row needs multiple controls, images, or arbitrary layout.

## 2. `list` (CustomListTableData)

```xml
<list id="song-list" data="songs" select-cell="select-song"
      list-style="List" cell-size="8.5" visible-cells="5"
      list-width="60" show-scrollbar="true" expand-cell="true"/>
```

```csharp
using BeatSaberMarkupLanguage.Attributes;
using BeatSaberMarkupLanguage.Components;
using HMUI;

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
private void PostParse()
{
    songList.Data = Songs;
    songList.TableView.ReloadData();
}
```

### Cell types

`CustomListTableData.CustomCellInfo` has:

```csharp
new CustomCellInfo(string text, string subtext = null, Sprite icon = null)
```

- `List` uses the game song-list cell: title, author, icon. It hides BPM/duration/badges.
- `Box` uses the game cover cell; `cell-size` is usually `30` for horizontal and `35` for vertical.
- `Simple` uses a plain text cell; `cell-size` is `8`.
- `expand-cell="true"` widens the title/author text in `List` style.

### Size calculation

- Vertical list: `list-width` (default 60) × `cell-size * visible-cells` (default `8.5 * 7`).
- Horizontal list: `cell-size * visible-cells` (default `8.5 * 4`) × `list-height` (default 40).

Set `cell-size` and `visible-cells` deliberately; the preferred size is computed from them.

### Updating

```csharp
Songs.Clear();
Songs.Add(new CustomListTableData.CustomCellInfo("New song", "New artist"));
songList.Data = Songs;
songList.TableView.ReloadData();
```

`ReloadData()` is required after mutating the collection. BSML does not observe `List<T>` or `ObservableCollection<T>` for you.

## 3. `custom-list` (CustomCellListTableData)

```xml
<custom-list id="mod-list" contents="mods" select-cell="select-mod"
             cell-size="10" visible-cells="4" list-width="60"
             clickable-cells="true" show-scrollbar="true">
  <horizontal child-expand-width="false" pad="1" spacing="1">
    <image src="~icon" pref-width="8" pref-height="8" preserve-aspect="true"/>
    <text text="~name" align="MidlineLeft" font-size="4"/>
    <button text="Use" on-click="use-current"/>
  </horizontal>
</custom-list>
```

```csharp
[UIComponent("mod-list")] private CustomCellListTableData modList;

[UIValue("mods")]
public List<ModItem> Mods { get; } = new();

[UIAction("select-mod")]
private void SelectMod(TableView table, object item) =>
    Plugin.Log.Info($"Selected {((ModItem)item).Name}");

[UIAction("#post-parse")]
private void PostParse() => modList.TableView.ReloadData();
```

```csharp
internal class ModItem
{
    [UIValue("name")] public string Name { get; }
    [UIValue("icon")] public string Icon { get; }

    public ModItem(string name, string icon)
    {
        Name = name;
        Icon = icon;
    }

    [UIAction("use-current")]
    private void Use() => Plugin.Log.Info($"Use {Name}");
}
```

`Icon` is a **resource path string** (`#GameSprite`, a URL, a file path, or an embedded resource), not a `Sprite`. `ImageHandler` converts the value to a string before loading it. If you already have a `Sprite`, set `Image.sprite` in code through `[UIComponent]` instead of `src`.

Key points:

- The tag body is captured as `cellTemplate` (`_children`) and wrapped in `<bg>`. It is not parsed as a child of the list.
- Each cell is parsed with the **item** as host. `~name` and `~icon` resolve against that item.
- `on-click="use-current"` resolves against the item host, not the screen host. Define the action on the item, or use `macro.as-host` to switch hosts.
- `select-cell` receives `(TableView, object)` where the object is the item.
- `clickable-cells="false"` removes the `Touchable` component; use it when the cell only contains its own buttons.
- `cell-size`, `visible-cells`, `list-width`, `list-height`, `list-direction` work like `list`.
- `show-scrollbar` only works for vertical lists.

### Selected/hovered visuals

```xml
<custom-list ...>
  <horizontal>
    <bg tags="selected" background="round-rect-panel" bg-color="#ffffff20" size-delta="0 0"/>
    <bg tags="hovered" background="round-rect-panel" bg-color="#ffffff10" size-delta="0 0"/>
    <text text="~name"/>
  </horizontal>
</custom-list>
```

- `tags="selected"` objects are active when the cell is selected.
- `tags="hovered"` objects are active when highlighted.
- `tags="un-selected-un-hovered"` objects are active otherwise.
- Add `[UIAction("refresh-visuals")] private void RefreshVisuals(bool selected, bool highlighted)` to the item to react in code.

## 4. Page buttons

Lists and scroll containers register named page events from their `id`:

```xml
<vertical>
  <page-button direction="Up" click-event="mod-list#PageUp" pref-width="4" pref-height="4"/>
  <custom-list id="mod-list" contents="mods" .../>
  <page-button direction="Down" click-event="mod-list#PageDown" pref-width="4" pref-height="4"/>
</vertical>
```

- `list` and `custom-list` register `<id>#PageUp` / `<id>#PageDown`.
- `scrollable-container` registers the same events from its `id`.
- `page-button` uses `click-event`, not `on-click`, for these.
- `page-button direction` controls the arrow rotation and the default size: Up/Down are 40×6, Left/Right are 6×40. Override with `pref-width`/`pref-height`.

A list also has `show-scrollbar="true"` for vertical lists; this creates a scrollbar and page buttons in the game style, but the page buttons are internal and not exposed as `[UIComponent]` children of your XML.

## 5. `scroll-view`

The game's `TextPageScrollView`; it already contains page up/down buttons and a vertical indicator.

```xml
<scroll-view pref-height="60">
  <vertical spacing="1" child-control-height="false">
    <text text="Section one"/>
    <text text="Long content..."/>
    <text text="Section two"/>
  </vertical>
</scroll-view>
```

- Children are placed in a vertical content layout.
- The content is measured from the first child layout; use a `pref-height` or a layout group with `ContentSizeFitter`.
- `scroll-view` is usually the simplest choice for a settings page or a long help page.
- `settings-container` is a `scroll-view` with settings-specific defaults; use it inside a settings menu.

## 6. `scrollable-container`

A custom scroll area with explicit page buttons, an indicator, and focus items.

```xml
<vertical>
  <page-button tags="PageUpFor:log" direction="Up" pref-width="4" pref-height="4"/>
  <scrollable-container id="log" align-bottom="true" scroll-to-bottom-on-update="true"
                        size-delta="0 -4">
    <vertical spacing="1">
      <text text="Line 1"/>
      <text text="Line 2"/>
      <text text="Line 3" tags="ScrollFocus"/>
    </vertical>
  </scrollable-container>
  <page-button tags="PageDownFor:log" direction="Down" pref-width="4" pref-height="4"/>
  <scroll-indicator tags="IndicatorFor:log"/>
</vertical>
```

- `id` links the container to the page events and tagged controls.
- `PageUpFor:<id>` / `PageDownFor:<id>` tags mark the page buttons.
- `IndicatorFor:<id>` marks the scroll indicator.
- `ScrollFocus` marks items that participate in focus scrolling.
- `align-bottom="true"` starts at the bottom.
- `scroll-to-bottom-on-update="true"` follows new content; useful for logs.
- `mask-overflow="false"` lets content extend beyond the mask.

Place the page buttons and indicator **outside** the `scrollable-container` so they do not scroll with the content; the tags let the handler find them anywhere in the same parse.

## 7. `settings-container`

`settings-container` (aliases `settings-scroll-view`, `scrollable-settings-container`) is the root for a settings page:

```xml
<settings-container>
  <vertical child-control-height="false" spacing="1" pad="2">
    <toggle-setting text="Enabled" value="enabled" apply-on-change="true"/>
    <slider-setting text="Volume" value="volume" min="0" max="1" increment="0.05"/>
  </vertical>
</settings-container>
```

- It is a scroll view, not a plain panel.
- Do not place a `settings-container` inside another `settings-container` unless you intentionally want nested scrolling.
- A `settings-submenu` body should contain a `settings-container`.

## 8. Common list and scroll failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| `InvalidCastException` on `list` data | Data is not `IList<CustomListTableData.CustomCellInfo>` | Use the exact cell type |
| `custom-list` is empty | `contents` missing or not an `IList` | Add `[UIValue]` and `contents` |
| `custom-list` shows the same row | Template bound to the screen host, not the item | Use `~` against item members; define actions on the item |
| List does not refresh | Mutated the collection without `ReloadData()` | Call `TableView.ReloadData()` |
| List has zero height | `visible-cells`/`cell-size` not set, or parent layout clips it | Set both; check the parent layout |
| Page button does nothing | Wrong event id or button inside the scrolled content | Use `<id>#PageUp`; place the button outside the container |
| Scroll view shows no content | Content has no measured height | Add a vertical layout and a preferred height |
| Scrollbar missing | `show-scrollbar` on a horizontal list, or no `id` on `scrollable-container` | Vertical lists only; add `id` and tagged controls |
| Text is clipped | `overflow-mode` or a fixed `pref-height` | Use `Ellipsis`, increase the height, or disable wrapping |
| Custom cell actions do nothing | Action belongs to the outer screen host | Define it on the item host |

## 9. Source

- `ListTag`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Tags/ListTag.cs>
- `CustomListTag`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Tags/CustomListTag.cs>
- `CustomListTableData`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Components/CustomListTableData.cs>
- `CustomCellListTableData`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Components/CustomCellListTableData.cs>
- `ScrollableContainerTag`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Tags/ScrollableContainerTag.cs>
- `ScrollViewTag`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Tags/ScrollViewTag.cs>
