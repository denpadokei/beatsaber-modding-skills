# Macros

Macros are tags prefixed with `macro.`. They run while the template is parsed and either include children conditionally, repeat children for a list, define a value, switch the host, or reparent existing transforms. They do **not** create a GameObject of their own.

Macro index: <https://monkeymanboy.github.io/BSML-Docs/Macros/> · Source: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/tree/master/BeatSaberMarkupLanguage/Macros>

## 1. `macro.if`

```xml
<macro.if value="enabled">
  <text text="Enabled"/>
</macro.if>

<macro.if value="!enabled">
  <text text="Disabled"/>
</macro.if>
```

- `value` / `bool` points to a `[UIValue]` that must be a `bool`.
- A leading `!` inverts the test.
- If the value is missing, `ValueNotFoundException` is thrown.
- The condition is evaluated **once at parse time**. Changing the bool later does not add or remove the children. For runtime visibility, use `active="~enabled"` on a real element.

## 2. `macro.for-each`

```xml
<macro.for-each items="rows" pass-back-tags="true">
  <text text="~name"/>
  <button text="Open" on-click="open"/>
</macro.for-each>
```

- `items` / `hosts` points to a `[UIValue]` that implements `IEnumerable`.
- Children are parsed once per item, with the **item as the host**. `~name` resolves against the item, and `on-click="open"` resolves against the item.
- `pass-back-tags="true"` passes tags collected in each per-item parser back to the parent parser. This is used by tab and list templates.
- The item list is read once at parse time. Add or remove items by re-parsing or by rebuilding the UI, not by mutating the list.

A typical row item:

```csharp
internal class Row
{
    [UIValue("name")] public string Name { get; }
    [UIValue("index")] public int Index { get; }

    public Row(string name, int index)
    {
        Name = name;
        Index = index;
    }

    [UIAction("open")]
    private void Open() => Plugin.Log.Info($"Open {Name} ({Index})");
}
```

## 3. `macro.define`

```xml
<macro.define name="button-text" value="Macro defined button text"/>
<button text="~button-text"/>
```

- `name` / `id` is the new value id.
- `value` is a string.
- The value is stored in `BSMLParserParams.Values`; it can be used with `~`.
- If the id already exists, its value is replaced.
- Useful for static labels that would otherwise be duplicated.

## 4. `macro.as-host`

```xml
<macro.as-host host="some-object">
  <text text="~name"/>
</macro.as-host>
```

- `host` points to a `[UIValue]` whose value is an object.
- Children are parsed with that object as the host.
- Use it when a reusable template should bind to a different object than the current host.
- The host object must expose the members used by the children.

## 5. `macro.reparent`

```xml
<macro.reparent transform="some-transform"/>
<macro.reparent transforms="some-transforms"/>
```

- `transform` points to a `[UIValue]` of type `Transform`.
- `transforms` points to a `[UIValue]` of type `List<Transform>`.
- The transform(s) are parented to the current element's parent, with `worldPositionStays: false`.
- This is how BSML's gameplay setup moves the game's vanilla panels into a custom tab layout.

## 6. Parse-time semantics

Macros are not reactive. They operate on the XML tree while it is being parsed:

- `macro.if` chooses a branch once.
- `macro.for-each` expands once.
- `macro.define` writes a value once.
- `macro.as-host` switches the host for its subtree.
- `macro.reparent` moves objects once.

For runtime behavior, use real tags and bindings:

| Need | Use |
| --- | --- |
| Show/hide based on a bool | `active="~property"` on a real element |
| Change text | `text="~property"` |
| Change a sprite | `src="~property"` |
| Add/remove rows | Rebuild the list and call `ReloadData()` |
| Repeat a fixed set | `macro.for-each` |

`active="~property"` updates live only when the host implements `INotifyPropertyChanged` and the value is a property. See [Syntax and bindings](syntax-and-bindings.md).

## 7. Macros inside list templates

`custom-list` captures its body as a template, then parses it per item. A `macro.for-each` inside that body would run for each item, with the item as the outer host. Keep cell templates simple; if a cell needs the outer screen host, put the needed values on the item or use `macro.as-host`.

## 8. Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `MacroNotFoundException` | Missing `macro.` prefix or typo | Use `macro.if`, not `if` |
| `ValueNotFoundException` | Bool/list/transform id missing | Add `[UIValue]` with that id |
| `macro.if` does not change at runtime | It is parse-time only | Use `active="~bool"` |
| `macro.for-each` renders one row | `items` is not `IEnumerable` | Use a `List<T>`, array, etc. |
| Actions inside `for-each` do nothing | Action is not on the item host | Define it on the item, or switch hosts |
| Reparent has no effect | Transform is null or already parented elsewhere | Check the `[UIValue]` and the object lifetime |
| Tags lost after `for-each` | `pass-back-tags` false | Set `pass-back-tags="true"` |

## 9. Source

- `IfMacro`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Macros/IfMacro.cs>
- `ForEachMacro`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Macros/ForEachMacro.cs>
- `DefineMacro`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Macros/DefineMacro.cs>
- `AsHostMacro`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Macros/AsHostMacro.cs>
- `ReparentMacro`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Macros/ReparentMacro.cs>
