# Syntax and bindings

BSML looks like XML, but its rules come from the parser and the type handlers, not from a schema. This file documents what the parser actually does with an element, an `id`, a `~value`, a `#event`, and a host member.

Canonical docs: <https://monkeymanboy.github.io/BSML-Docs/> · Attributes: <https://monkeymanboy.github.io/BSML-Docs/Attributes/Attributes/>

## 1. XML rules

```xml
<bg xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="https://monkeymanboy.github.io/BSML-Docs/ https://monkeymanboy.github.io/BSML-Docs/BSMLSchema.xsd">
  <vertical spacing="1" pad="2">
    <text text="Hello" align="Center" font-size="5"/>
    <button text="Play" on-click="PlayClicked"/>
  </vertical>
</bg>
```

- **One root element.** The root may be `<bg>`, `<vertical>`, `<settings-container>`, `<modal>`, `<tab>`, and so on.
- **Tag names are lowercase and case-sensitive.** `Text` is not `text`.
- **Attribute names are lowercase, hyphenated, and case-sensitive.** `font-size`, not `fontSize` or `FontSize`.
- **The XML namespace is ignored.** The `xmlns`/`xsi` attributes are for editor completion; BSML reads `LocalName`.
- **Unknown elements throw** `TagNotFoundException`. **Unknown attributes are ignored silently.** This is the single most common source of "nothing happened".
- **Escaping is normal XML.** Write `&amp;`, `&lt;`, `&gt;`, `&quot;`; rich-text tags such as `<color=#fff>` must be escaped unless they are the value of an attribute that is parsed as rich text.
- **Vectors use spaces, not commas.** `size-delta="10 4"`, `anchor-min="0 1"`, `spacing="1 2"`. A single number is broadcast where the parser supports it.
- **Numbers are invariant culture.** Use `0.5`, not `0,5`.
- **Booleans are `true`/`false`** (capitalized `True`/`False` also parses, but use lowercase).
- **Enums use the C# name**, case-sensitive: `Center`, `PreferredSize`, `Vertical`, `List`, `Clean`.
- **Colors are HTML strings**: `#fff`, `#ffffff`, `#ffffff80`, `red`, `white`. The parser uses `ColorUtility.TryParseHtmlString`.
- **`~` at the start of an attribute value means "read a `[UIValue]`"**. `text="~label"` reads the value with id `label`.
- **`#` at the start of a `[UIAction]` id means "subscribe to an event"**. `[UIAction("#post-parse")]`.

## 2. `id`, `[UIComponent]`, `[UIObject]`

`id` is not a normal attribute. The parser handles it after the tag and all type handlers have run:

```xml
<text id="status" text="Ready"/>
<button id="play" text="Play"/>
```

```csharp
[UIComponent("status")] private TextMeshProUGUI status;
[UIObject("status")]    private GameObject statusObject;
[UIComponent("play")]   private Button playButton;
[UIComponent("play")]   private TextMeshProUGUI playLabel;
```

- `[UIComponent]` can be applied to a field or a property; the field type must be a component on that object.
- `[UIObject]` can be applied to a field or a property of type `GameObject`.
- The parser searches `ExternalComponents` first, then `GetComponent`. This is why `[UIComponent("play")] TextMeshProUGUI` returns the button's label even though the label is a child object.
- If no component of the requested type exists, the field is assigned `null`; no exception is thrown.
- Fields are assigned after type handlers, so `[UIComponent]` is safe in `#post-parse`, not in `Awake`.

`id` values should be unique within a template. If several fields use the same id, all receive the same component; prefer explicit names to avoid confusion.

## 3. `[UIValue]`: values and two-way binding

```xml
<toggle-setting text="Enabled" value="enabled" apply-on-change="true"/>
<text text="~status-text"/>
```

```csharp
[UIValue("enabled")]
public bool Enabled { get; set; } = true;

[UIValue("status-text")]
private string statusText = "Ready";
```

- `[UIValue]` can be on a field or a property.
- `value="enabled"` in a settings tag looks up the value by id and reads/writes it.
- `~enabled` in any attribute inserts the value's `ToString()`.
- Without `[HostOptions]`, **all** public and private fields/properties are also addressable by their member name, not just `[UIValue]` members. `[UIValue]` is an explicit alias on top of that.
- If a field and a property share the same name, the field wins. Avoid duplicate names.
- Duplicate `[UIValue]` ids throw `InvalidOperationException` at parse time.

### Opting out of implicit access

```csharp
using BeatSaberMarkupLanguage.Attributes;

[HostOptions(
    FieldAccessOption.OptIn,
    PropertyAccessOption.OptIn,
    MethodAccessOption.OptIn)]
internal class StrictHost
{
    [UIValue("enabled")] public bool Enabled { get; set; }
    [UIAction("apply")] private void Apply() { }
}
```

- `Auto` (default) exposes members by name and still honors `[UIValue]`/`[UIAction]`.
- `OptIn` exposes only attributed members.
- `AllowBoth` exposes the attributed id and the member name.

Use `OptIn` on a large host to avoid accidentally binding a member with a common name such as `Name` or `Text`.

### Live updates with `~`

For a normal type handler, a `~property` value is automatically re-applied when the host raises `PropertyChanged`:

```csharp
internal class CounterHost : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler PropertyChanged;

    [UIValue("count")]
    public int Count { get; private set; }

    [UIAction("add")]
    private void Add()
    {
        Count++;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Count)));
    }
}
```

```xml
<text text="~count"/>
<button text="Add" on-click="add"/>
```

- Binding only works for **properties**, not fields.
- The host must implement `INotifyPropertyChanged`.
- If the value is used on a settings tag, the widget does not subscribe automatically; add `bind-value="true"` to the settings tag. See [Settings](settings.md).
- `PropertyChanged` with an empty or `null` property name refreshes every bound handler on that host.

## 4. `[UIAction]`: methods and events

```csharp
[UIAction("play")]
private void Play() { }
```

```xml
<button text="Play" on-click="play"/>
```

- The method may be private; BSML scans non-public instance and static methods.
- If the method has no `[UIAction]`, its **method name** is also available unless `MethodAccessOption.OptIn`.
- If `[UIAction("play")]` is on a method named `Play`, both `play` and `Play` work with `AllowBoth`; with `Auto`, the id is used and the method name is used only if it differs and is not already registered.
- Duplicate `[UIAction]` ids throw at parse time.
- A button click invokes the action with **no arguments**. A settings `on-change` invokes it with the new value. A list `select-cell` invokes it with the table and index (or item).
- `[UIAction("#post-parse")]` is an event subscription, not a normal action. The parser emits `post-parse` after building the template.
- `[UIAction("#apply")]` and `[UIAction("#cancel")]` are emitted by the BSML mod settings flow. `apply` writes every settings value back to its host; `cancel` reads the host values back into the widgets, discarding the edits.
- `[UIAction("#anything-else")]` can be emitted from XML with `click-event`, `show-event`, `hide-event`, or from code with `BSMLParserParams.EmitEvent("anything-else")`.

### Event attributes

| Attribute | On | Effect |
| --- | --- | --- |
| `on-click` | `button`, `clickable-text`, `clickable-image`, `primary-button`, `page-button` | Invoke a `UIAction` |
| `click-event` | Same controls | Emit a named event |
| `show-event` | `modal`, `modal-keyboard`, `modal-color-picker` | Show the modal when the event fires |
| `hide-event` | `modal` | Hide the modal when the event fires |
| `on-change` | Settings tags | Invoke a `UIAction` with the new value |
| `formatter` | Settings tags | Invoke a `UIAction` that returns a display string |
| `select-cell` | Lists, segmented controls | Invoke a `UIAction` with the selection |

`click-event` and `show-event` accept comma-separated names. The parser stores an event as a multicast delegate, so several handlers can subscribe to the same name.

```xml
<button text="Open" click-event="open-modal"/>
<modal show-event="open-modal" hide-event="close-modal" click-off-closes="true">
  <text text="Hello"/>
  <button text="Close" click-event="close-modal"/>
</modal>
```

## 5. `tags` and `BSMLParserParams`

`tags="a,b"` attaches arbitrary tags to the created GameObject. They are resolved after the parse through `BSMLParserParams`:

```csharp
[UIParams] private BSMLParserParams parserParams;

List<GameObject> selected = parserParams.GetObjectsWithTag("selected");
parserParams.EmitEvent("refresh-visuals");
```

Tags are used by:

- `macro.for-each pass-back-tags="true"` — pass tags from the per-item parser back to the parent.
- `custom-list` cells — `selected`, `hovered`, `un-selected-un-hovered` switch visuals automatically; `refresh-visuals` lets you react to state.
- `scrollable-container` — `ScrollFocus`, `PageUpFor:<id>`, `PageDownFor:<id>`, `IndicatorFor:<id>`.
- `tab` — the tab's own `tags` must match the selector's `tab-tag`.

`BSMLParserParams` also exposes:

```csharp
parserParams.Actions;   // id -> BSMLAction
parserParams.Values;    // id -> BSMLValue
parserParams.AddEvent("apply", MyApply);
parserParams.EmitEvent("apply");
parserParams.Host;
```

`[UIParams]` is only assigned on a field (not a property), and only when the host is scanned.

## 6. How an element is processed

For each element:

1. Look up the tag alias in `BSMLParser.tags`.
2. Call `BSMLTag.CreateObject(parent)`.
3. Find every component on the new object (including `ExternalComponents`) that has a registered `TypeHandler`.
4. For each handler, read the attributes declared in `Props`, including aliases.
5. Apply `Setters`; if an attribute value came from `~property` and the host implements `INotifyPropertyChanged`, register a live update.
6. Assign `[UIComponent]`/`[UIObject]` fields whose id matches.
7. Register `tags`.
8. Recurse into children, unless the tag disables it (`custom-list` is the main example).
9. Run `HandleTypeAfterChildren` and then `HandleTypeAfterParse` for each handler.
10. Emit `post-parse`.

The order explains several behaviors:

- A type handler can require a child component; it uses `HandleTypeAfterChildren` (settings do this in `Setup`).
- A type handler can require the completed tree; it uses `HandleTypeAfterParse` (`scrollable-container` resolves its page buttons this way).
- An attribute that is not in `Props` is never read. The XML parser still accepts it, so there is no error.
- `[UIComponent]` assignment happens after type handlers, so a handler cannot rely on a `[UIComponent]` field being populated.

## 7. Value conversion reference

| BSML type | Accepted form | Example |
| --- | --- | --- |
| `bool` | `true` / `false` | `interactable="false"` |
| `int` | invariant integer | `visible-cells="7"` |
| `float` | invariant decimal | `increment="0.05"` |
| `Vector2` | 1 or 2 numbers, space-separated | `size-delta="10 4"` |
| `Vector3` | 1-3 numbers, space-separated | `scale="1 1 1"` |
| `Vector4` | 1-4 numbers, space-separated | `raycast-padding="1 1 1 1"` |
| `Color` | HTML color, named color, `#RRGGBBAA` | `color="#ffcc00"` |
| `RectOffset` | 1-4 integers (padding) | use `pad-top`/`pad-bottom`/`pad-left`/`pad-right` for clarity |
| enum | C# enum name, case-sensitive | `align="Center"`, `list-style="Simple"` |
| resource path | embedded resource, file path, URL, or `#GameSprite` | `src="#OneLifeIcon"` |
| `UIAction` | method name or `[UIAction]` id | `on-click="Play"` |
| `UIValue` | member name or `[UIValue]` id | `value="enabled"` |
| event | comma-separated event names | `click-event="open,refresh"` |

`RectOffset` is parsed from 1-4 integers. Use the four individual `pad-*` attributes when the sides differ; they are unambiguous and bypass multi-value parsing.

## 8. `ExternalComponents`

A tag can create a component on a child object and expose it to `[UIComponent]` by adding it to an `ExternalComponents` component on the tag's root:

```csharp
ExternalComponents external = gameObject.AddComponent<ExternalComponents>();
external.Components.Add(childText);
external.Components.Add(childButton);
```

`BSMLParser.GetExternalComponent` checks this list before `GetComponent`. Built-in examples:

- `button` exposes its label and layout group.
- `icon-button` exposes the icon image and layout group.
- `tab`/`tab-selector` expose the segmented control.

If you write a custom tag and `[UIComponent]` cannot find your component, this is almost always the missing piece.

## 9. Source

- `BSMLParser`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/BSMLParser.cs>
- `BSMLParserParams`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Parser/BSMLParserParams.cs>
- `TypeHandler` binding: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/TypeHandlers/TypeHandler.cs>
- `HostOptionsAttribute`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Attributes/HostOptionsAttribute.cs>
- `Parse` helpers: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Parse.cs>
