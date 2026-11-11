# Styling and assets

BSML layouts are Unity UI layouts. The parser gives you terse attribute names, but the rules are still RectTransform, layout groups, `ContentSizeFitter`, sprites, and TextMeshPro. This file covers the recipes that are easy to get wrong.

Canonical docs: <https://monkeymanboy.github.io/BSML-Docs/> · Source: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/tree/master/BeatSaberMarkupLanguage/TypeHandlers>

## 1. The layout model

A UI object has:

- **Anchors** (`anchor-min`, `anchor-max`) — where it attaches inside its parent, from `0` to `1`.
- **Pivot** (`pivot`) — the point used for position and rotation.
- **Size delta** (`size-delta`) — size added to the anchor rectangle.
- **Anchored position** (`anchored-position`) — position of the pivot relative to the anchors.
- **Layout element** (`pref-width`, `pref-height`, `min-*`, `flexible-*`) — what a parent layout group should do with it.
- **Layout group** (`vertical`, `horizontal`, `grid`, `stack`) — arranges children.
- **Content size fitter** (`horizontal-fit`, `vertical-fit`) — sizes the object to its content or the parent.

The common mistake is mixing anchors and a layout group without deciding which one owns the size. Pick one:

- **Anchor-driven**: the object fills or sits at a fraction of the parent. Use `anchor-*`, `size-delta`, `anchored-position`.
- **Layout-driven**: the parent arranges the object. Use `pref-*`, `min-*`, `flexible-*`, and `child-control-*`.

`pref-width` on an object with no layout group parent does nothing. `size-delta` inside a layout group is usually overridden by the layout.

## 2. Recipes

### Full-screen root

```xml
<bg size-delta="0 -10" anchored-position="0 -5">
  ...
</bg>
```

`bg` already anchors to all four corners. `size-delta` shrinks it; `anchored-position` offsets it.

### Centered fixed-width panel

```xml
<vertical horizontal-fit="PreferredSize" vertical-fit="PreferredSize"
          anchor-min="0.5 0.5" anchor-max="0.5 0.5"
          pref-width="80" spacing="2" pad="2" bg="round-rect-panel">
  ...
</vertical>
```

- Anchor both corners to the center.
- `horizontal-fit`/`vertical-fit` hug the content.
- `pref-width` gives the panel a stable width.
- `bg` paints the game's rounded panel.

### Full-width row

```xml
<vertical child-control-width="true" child-expand-width="true" spacing="1">
  <horizontal child-control-width="true" child-expand-width="true" spacing="1">
    <text text="Left" flexible-width="1"/>
    <text text="Right" flexible-width="1"/>
  </horizontal>
</vertical>
```

- The parent must control and expand width.
- Children with `flexible-width="1"` share the extra space equally.

### Fixed-width settings page

```xml
<settings-container>
  <vertical child-control-height="false" child-control-width="true"
            child-expand-width="true" spacing="1" pad="2">
    <toggle-setting text="Enabled" value="enabled" apply-on-change="true"/>
    <slider-setting text="Volume" value="volume" min="0" max="1" increment="0.05"/>
  </vertical>
</settings-container>
```

Settings widgets have a preferred width of about 90; the settings container gives the page its width. Do not set `size-delta-x` on every widget.

### Overlay

```xml
<bg>
  <vertical child-control-height="false" child-align="MiddleCenter" spacing="1">
    <text text="Paused" font-size="10" align="Center"/>
    <button text="Resume" on-click="resume"/>
  </vertical>
</bg>
```

`bg` fills the parent; the vertical centers its children.

## 3. Backgrounds

```xml
<bg bg="round-rect-panel" bg-color="#ffffff20" bg-alpha="0.8" size-delta="80 40"/>
<bg bg="panel-top-gradient" bg-color0="#00ffffff" bg-color1="#ff00aaff"/>
```

Accepted `bg` names:

| Name | Game template | Typical use |
| --- | --- | --- |
| `round-rect-panel` | Rounded panel | Cards, dialogs |
| `panel-top` | Top panel | Header bars |
| `panel-fade-gradient` | Fade background | List cells |
| `panel-top-gradient` | Gradient top panel | Accent headers |
| `title-gradient` | Title gradient | Main-menu headings |

Only one background can be applied per object. `background-gradient="true"` turns on the gradient for an existing background; `bg-color0`/`bg-color1` set its ends.

## 4. Text

```xml
<text text="Header" font-size="8" align="Center" bold="true" font-color="#ffffff"/>
<text text="Subtitle" font-size="4" italics="true" align="Center"/>
<text text="Wrapped text" font-size="4" word-wrapping="true" overflow-mode="Ellipsis" pref-width="60"/>
```

- `font-size` is in game units. `4` is small, `6` is a heading, `8-10` is a large title.
- `align` uses TextMeshPro `TextAlignmentOptions`: `Center`, `Midline`, `MidlineLeft`, `MidlineRight`, `Left`, `Right`, `Top`, `Bottom`, etc.
- `overflow-mode`: `Overflow`, `Ellipsis`, `Masking`, `Truncate`, `Page`, `Linked`.
- `rich-text="true"` enables TMP rich text. Escape the tags in XML:

```xml
<text text="&lt;color=#ff0000&gt;Red&lt;/color&gt; and &lt;b&gt;bold&lt;/b&gt;"/>
```

- `font-size-min`/`font-size-max` plus `enable-auto-sizing="true"` is useful for buttons with variable labels.
- `monochrome="true"` uses the game's monochrome font. Use it for icon-like glyphs and some symbols.

### Localization

```xml
<text text-key="BUTTON_OK"/>
<button text-key="BUTTON_CANCEL"/>
<text text="Plain text"/>
<clickable-text text="Info" hover-hint-key="MY_MOD_INFO_HINT"/>
```

- `text-key` uses `LocalizedTextMeshProUGUI` and updates on language change.
- `hover-hint-key` resolves once with `Localization.Get`; it does not update live.
- Do not set both `text` and `text-key`; the last handler wins.
- In code: `using BGLib.Polyglot; Localization.Get("KEY");`

## 5. Colors

| Form | Example | Notes |
| --- | --- | --- |
| Named | `red`, `white`, `cyan` | Alpha defaults to 1 |
| Short hex | `#f00` | Alpha defaults to 1 |
| Hex | `#ff0000` | Alpha defaults to 1 |
| Hex with alpha | `#ff000080` | Alpha is used |
| Transparent | `#00000000` | Fully transparent |

`bg-color`/`image-color`/`font-color` use the same parser. `bg-alpha` overrides the background alpha after the color is applied.

## 6. Images and sprites

```xml
<image src="#OneLifeIcon" pref-width="8" pref-height="8" preserve-aspect="true"/>
<image src="https://example.com/cover.png" pref-width="30" pref-height="30"/>
<image src="C:\path\to\cover.png"/>
<image src="MyMod.Resources.cover.png"/>
<image src="OtherAssembly:Resources.cover.png"/>
<raw-image src="#WhitePixel"/>
```

`src` resolution:

1. `#Name` — `Resources.FindObjectsOfTypeAll<Sprite>()` by name. These are game sprites; names can change between game versions.
2. `http://` or `https://` — downloaded with `UnityWebRequest`.
3. A file that exists on disk — loaded with `System.Drawing`.
4. Otherwise — an embedded resource. `AssemblyName:path` selects the assembly explicitly; without a prefix, the first dotted segment is treated as the assembly name.

### Animated images

`image`/`clickable-image` support animated GIF and APNG when the path ends in `.gif`/`.apng` (including a URL path). The animation is cached by location and can be reused. `raw-image` loads a static texture; it does not run the animation controller.

### Button icons and artwork

```xml
<icon-button icon="#OneLifeIcon" icon-skew="0" show-underline="false"
             on-click="select" pref-width="10" pref-height="10"/>
```

- `icon` uses the same resource-path rules.
- `icon-skew` changes the icon's skew; `show-underline` toggles the button underline.
- `artwork` targets a `ButtonArtworkImage` component. The standard `button` tag does not create one; use a custom tag that adds `ButtonArtworkImage` if you need artwork.

## 7. Hover hints

```xml
<button text="?" hover-hint="Open the manual"/>
<button text="?" hover-hint-key="MY_MOD_MANUAL_HINT"/>
<text text="Info" hover-hint="A short explanation"/>
```

`hover-hint` adds a `HoverHint` to the object. It works on any tag with a RectTransform. `hover-hint-key` resolves the localization key once; use `hover-hint` if the text is dynamic.

## 8. Sizing cheat sheet

| Goal | Use |
| --- | --- |
| Fill the parent | `anchor-min="0 0"`, `anchor-max="1 1"`, `size-delta="0 0"` |
| Inset from the parent | `size-delta="-10 -10"` on a filling object |
| Fixed width | `pref-width="80"` with a layout parent, or `size-delta-x="80"` without one |
| Fixed height | Same for height |
| Content-sized | `horizontal-fit`/`vertical-fit` `PreferredSize` |
| Share extra space | `flexible-width="1"` / `flexible-height="1"` |
| Spacer | `<bg flexible-height="1"/>` or `<vertical flexible-height="1"/>` inside a layout |
| Center | Anchor both corners to `0.5 0.5` |
| Top center | `anchor-min="0.5 1"`, `anchor-max="0.5 1"`, `pivot="0.5 1"` |

## 9. Common styling failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| Everything is huge | `font-size` is in game units, not points | Use 4-6 for body text |
| Panel is invisible | No `bg`, or background color alpha is 0 | Add a `bg` name and a non-zero alpha |
| Panel is zero-sized | Anchors collapsed and no preferred size | Set `size-delta` or `pref-*` |
| Text does not wrap | `word-wrapping` false or no width constraint | Enable wrapping and set `pref-width` |
| Rich text shows tags | `rich-text` false or the tags were not escaped | Enable rich text and escape `<`/`>` |
| Image is stretched | `preserve-aspect` false | Set `preserve-aspect="true"` |
| Image is blank | Wrong resource name or `#Sprite` name | Check the log; print resource names |
| Gradient does nothing | Background is not an `ImageView` or gradient is off | Use a gradient-capable `bg` and `background-gradient="true"` |
| `pref-width` ignored | Parent has no layout group | Add a layout group or use `size-delta` |
| Hover hint missing | No `HoverHintController` in the scene | Use it inside a BSML screen; BSML supplies the controller |
| Localized text is blank | Key missing from the localization table | Check the key; use `text` for debugging |

## 10. Source

- `RectTransformHandler`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/TypeHandlers/RectTransformHandler.cs>
- `Backgroundable`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Components/Backgroundable.cs>
- `TextMeshProUGUIHandler`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/TypeHandlers/TextMeshProUGUIHandler.cs>
- `ImageHandler`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/TypeHandlers/ImageHandler.cs>
- `SetImageAsync`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/BeatSaberUI.cs>
- `AnimationController`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/tree/master/BeatSaberMarkupLanguage/Animations>
