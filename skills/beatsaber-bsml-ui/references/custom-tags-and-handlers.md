# Custom tags and handlers

BSML is extensible at three points:

| Extension | Base class | Registered with |
| --- | --- | --- |
| New XML tag | `BSMLTag` | `BSMLParser.Instance.RegisterTag(...)` |
| New attribute set on an existing component | `TypeHandler` / `TypeHandler<T>` | `BSMLParser.Instance.RegisterTypeHandler(...)` |
| New `macro.*` behavior | `BSMLMacro` | `BSMLParser.Instance.RegisterMacro(...)` |

This is advanced material. Most mods never need it; a `custom-list` template or a small custom MonoBehaviour is usually enough. Register custom extensions once, after BSML is initialized, and test them against the BSML version you ship against.

Source: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/tree/master/BeatSaberMarkupLanguage/Tags> · <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/tree/master/BeatSaberMarkupLanguage/TypeHandlers>

## 1. When to extend

Use a custom tag when:

- The same compound of game objects appears in multiple templates.
- You need a component that no built-in tag creates.
- You want a short alias for a layout pattern.

Use a custom type handler when:

- You have a component with its own properties and want to set them from XML.
- You want `~` binding and type conversion for those properties.
- You need a tag-specific attribute that the built-in handlers do not provide.

Do not add a custom tag just to set two attributes. Use the existing tag and attributes.

## 2. Custom tag

```csharp
using BeatSaberMarkupLanguage.Tags;
using UnityEngine;
using UnityEngine.UI;

public class DividerTag : BSMLTag
{
    public override string[] Aliases => new[] { "divider" };

    public override GameObject CreateObject(Transform parent)
    {
        GameObject gameObject = new("BSMLDivider", typeof(RectTransform))
        {
            layer = 5,
        };

        gameObject.transform.SetParent(parent, false);

        LayoutElement layout = gameObject.AddComponent<LayoutElement>();
        layout.preferredHeight = 0.5f;
        layout.minHeight = 0.5f;

        Image image = gameObject.AddComponent<Image>();
        image.color = new Color(1f, 1f, 1f, 0.2f);
        image.raycastTarget = false;

        return gameObject;
    }
}
```

Register it once:

```csharp
BSMLParser.Instance.RegisterTag(new DividerTag());
```

Use it:

```xml
<vertical spacing="1">
  <text text="Above"/>
  <divider/>
  <text text="Below"/>
</vertical>
```

### Tag rules

- `Aliases` must be unique. Registering an alias that already exists throws.
- `CreateObject` must parent the new object to `parent` and set `layer = 5` (the UI layer).
- Return the root object. Children are parsed into it when `AddChildren` is true.
- Override `AddChildren => false` when the tag consumes its body (for example a template), and capture the body with a `_children` prop in a type handler if needed.
- `Initialize()` is called once by the parser for tags registered during BSML startup. A tag registered later does not receive it; put lazy prefab setup in `CreateObject` or in your own initialization.
- Add child components to `ExternalComponents` if `[UIComponent]` should find them.

## 3. Custom type handler

```csharp
using System;
using System.Collections.Generic;
using BeatSaberMarkupLanguage.TypeHandlers;
using UnityEngine;

[ComponentHandler(typeof(MyBadge))]
public class MyBadgeHandler : TypeHandler<MyBadge>
{
    public override Dictionary<string, string[]> Props => new()
    {
        { "label", new[] { "label", "text" } },
        { "badgeColor", new[] { "badge-color", "color" } },
        { "count", new[] { "count" } },
    };

    public override Dictionary<string, Action<MyBadge, string>> Setters => new()
    {
        { "label", (badge, value) => badge.Label = value },
        { "badgeColor", (badge, value) => badge.Color = Parse.Color(value) },
        { "count", (badge, value) => badge.Count = Parse.Int(value) },
    };
}
```

Register:

```csharp
BSMLParser.Instance.RegisterTypeHandler(new MyBadgeHandler());
```

Now any tag that creates a `MyBadge` component can use:

```xml
<badge label="New" badge-color="#ff0" count="3"/>
```

### Type handler rules

- `[ComponentHandler(typeof(T))]` is required. Without it, `RegisterTypeHandler` ignores the handler with a warning.
- `Props` maps an internal key to one or more XML attribute aliases. The first alias is not special; all are accepted.
- `Setters` maps the internal key to a setter. `TypeHandler<T>` calls the setter with the raw string.
- Use `Parse.Bool`, `Parse.Int`, `Parse.Float`, `Parse.Vector2`, `Parse.Vector3`, `Parse.Vector4`, `Parse.Color`, `Parse.RectOffset` for conversion.
- `HandleType` runs before children; `HandleTypeAfterChildren` runs after children; `HandleTypeAfterParse` runs after the whole template is built.
- The base `TypeHandler<T>.HandleType` automatically applies `~property` live updates when the host implements `INotifyPropertyChanged`.
- To bind manually, use `componentType.ValueMap` and the protected `BindValue` helper.

### Custom settings

If the component is a `GenericSetting`, the base `GenericSettingHandler` already handles `value`, `apply-on-change`, `bind-value`, `on-change`, `formatter`, `get-event`, and `set-event`. Add a tag-specific handler only for the component's own properties.

## 4. Custom macro

```csharp
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;
using BeatSaberMarkupLanguage.Macros;
using BeatSaberMarkupLanguage.Parser;
using UnityEngine;

public class RepeatMacro : BSMLMacro
{
    public override string[] Aliases => new[] { "repeat" };

    public override Dictionary<string, string[]> Props => new()
    {
        { "count", new[] { "count" } },
    };

    public override void Execute(
        XElement element,
        GameObject parent,
        Dictionary<string, string> data,
        BSMLParserParams parserParams,
        out IEnumerable<BSMLParser.ComponentTypeWithData> components)
    {
        components = Enumerable.Empty<BSMLParser.ComponentTypeWithData>();

        if (!data.TryGetValue("count", out string raw) || !int.TryParse(raw, out int count))
        {
            return;
        }

        for (int i = 0; i < count; i++)
        {
            foreach (XElement child in element.Elements())
            {
                BSMLParser.Instance.HandleNode(child, parent, parserParams, out IEnumerable<BSMLParser.ComponentTypeWithData> childComponents);
                components = components.Concat(childComponents);
            }
        }
    }
}
```

Register:

```csharp
BSMLParser.Instance.RegisterMacro(new RepeatMacro());
```

Aliases are automatically prefixed with `macro.`, so the tag is `<macro.repeat count="3">...</macro.repeat>`.

### Macro rules

- `Execute` must parse children itself with `BSMLParser.Instance.HandleNode` if it wants them created.
- Return the collected `ComponentTypeWithData` in `components`, or handlers that run after parse will miss them.
- Macro values are strings from `GetParameters`; use `Parse` helpers for typed values.
- `macro.for-each` and `macro.as-host` parse the same XML with a different host; follow that pattern if your macro switches hosts.

## 5. Registering safely

- BSML's parser is a Zenject singleton. It exists after the main menu initializes; registering at `OnApplicationStart` is too early.
- Register once. Repeated registration of the same alias throws.
- Do not replace a built-in alias. Use a mod-specific prefix such as `mymod-badge` if the name is generic.
- Custom handlers are not sandboxed; an exception in a setter propagates as a `TypeHandlerException` and can break the whole view.
- The public API surface (`BSMLTag`, `TypeHandler`, `BSMLMacro`, `Register*`) is stable enough for mods, but internal fields are not. Do not reflect into BSML internals.
- Re-test after a BSML update; the `Props` and component layout can change.

## 6. Source

- `BSMLTag`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Tags/BSMLTag.cs>
- `TypeHandler`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/TypeHandlers/TypeHandler.cs>
- `BSMLMacro`: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/Macros/BSMLMacro.cs>
- `BSMLParser` registration: <https://github.com/monkeymanboy/BeatSaberMarkupLanguage/blob/master/BeatSaberMarkupLanguage/BSMLParser.cs>
