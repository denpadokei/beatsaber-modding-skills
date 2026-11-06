# PC: Harmony Patching

Canonical page: <https://bsmg.wiki/modding/pc/harmony-patching.html> · Harmony docs: <https://harmony.pardeike.net/articles/patching.html>

Harmony lets a mod run code around, instead of, or inside a game method without editing the game files. It is the primary tool for altering behavior in PC Beat Saber.

## Setup

```csharp
using HarmonyLib;

internal class Plugin
{
    private Harmony harmony = null!;
    private static readonly Assembly ExecutingAssembly = Assembly.GetExecutingAssembly();

    [Init]
    public Plugin(PluginMetadata metadata) => harmony = new Harmony(metadata.Id);

    [OnStart]
    public void OnApplicationStart() => harmony.PatchAll(ExecutingAssembly);

    [OnExit]
    public void OnApplicationQuit() => harmony.UnpatchSelf();
}
```

Use the plugin ID as the Harmony instance ID. `PatchAll` applies every class in the assembly carrying `[HarmonyPatch]`. For fine control, use `harmony.Patch(original, prefix, postfix, transpiler)`.

## Patch types

| Type | Runs | Use for |
| --- | --- | --- |
| Prefix | Before the original | Gate execution (`return false` skips it), validate args, capture state, replace results |
| Postfix | After the original | Observe completion, read/replace `__result`, attach components |
| Transpiler | Compiles into the original IL | Rewriting internals that have no hook point |
| Finalizer | After the original, including exceptions | Cleanup or exception suppression |

Prefer postfix → prefix → transpiler, in that order. Transpilers are brittle across game updates and hard to review.

## Basic patches

```csharp
[HarmonyPatch(typeof(NoteController), nameof(NoteController.Init))]
internal class NoteInitPatch
{
    internal static void Postfix(NoteController __instance) =>
        Plugin.Log.Info($"A {__instance.GetType().Name} was initialized.");
}
```

```csharp
[HarmonyPatch(typeof(FlyingScoreEffect), nameof(FlyingScoreEffect.RefreshScore))]
internal class MaxScoreTextPatch
{
    internal static bool Prefix(FlyingScoreEffect __instance, int score, int maxPossibleCutScore)
    {
        if (score < maxPossibleCutScore)
            return true; // run the original

        __instance._text.text = "Hello World!";
        __instance._colorAMultiplier = 1f;
        return false; // skip the original
    }
}
```

`nameof` is safer than a string. When overloads exist, disambiguate with explicit argument types:

```csharp
[HarmonyPatch(typeof(SomeType), nameof(SomeType.DoThing), new[] { typeof(int), typeof(float) })]
```

Or use `[HarmonyPatch(typeof(T), "Method", MethodType.Getter)]` for property getters and `MethodType.Constructor` for constructors.

## Injected parameters

| Name | Type | Meaning |
| --- | --- | --- |
| `__instance` | declaring type | The target object (missing on static methods) |
| `___fieldName` | field type | Private field value; assignable |
| `__result` | return type | Return value; writable in postfixes |
| `__state` | any type | Value passed from prefix to postfix |
| `__originalMethod` | `MethodBase` | The patched method |
| `__args` | `object[]` | All arguments; writable, but slow |
| `__runOriginal` | `bool` | Whether the original runs (postfix/finalizer) |

Prefer direct named arguments (`int score`) over `__args`. Use `__state` instead of stashing data in static fields.

## Accessing private members

### Publicizer (preferred)

Mark the game assembly reference with `Publicize="true"` (see [project-setup.md](project-setup.md)). Private and protected members become accessible at compile time, with no runtime cost.

It cannot set `readonly` fields or getter-only auto-properties. For those, use reflection.

### Reflection

```csharp
using IPA.Utilities;

// Writes private fields, including readonly ones.
someObject.SetField("someValue", 0.5f);
```

For reads in hot paths, cache an accessor:

```csharp
private static readonly FieldAccessor<SomeClass, float>.Accessor SomeValueAccessor =
    FieldAccessor<SomeClass, float>.GetAccessor("someValue");

SomeValueAccessor(ref instance) = 1f;
```

For general private member access, prefer the publicizer. `ReflectionUtil` also exposes property setters and method invocation, but their generic signatures require explicit type arguments; check the BSIPA source before use.

Never publicize another mod's assembly. Use reflection, or request an API change.

## Patch classes and lifecycle

- A patch class can hold multiple patch methods.
- Static patch methods are the norm. For DI, use SiraUtil's [Affinity API](zenject-sirautil.md#affinity-patching).
- Patches are applied when `PatchAll` runs. Installing them in `[OnStart]` is standard; do not patch before the game's assemblies are loaded.
- `UnpatchSelf()` on exit prevents leaks across internal restarts.
- Patch priority: `[HarmonyPriority(Priority.High)]` when another mod may also patch the same method. Document any priority you set.

## Practical recipes

### Event-style postfix

```csharp
[HarmonyPatch(typeof(ScoreController), nameof(ScoreController.Start))]
internal class ScoreControllerStartPatch
{
    internal static void Postfix(ScoreController __instance) =>
        __instance.noteWasCutEvent += HandleNoteCut;

    private static void HandleNoteCut(NoteController note, NoteCutInfo info) { /* ... */ }
}
```

Remember to unsubscribe when the object is destroyed, or subscribe per-instance and let the object die with the event.

### Prefix with state

```csharp
[HarmonyPatch(typeof(SomeController), "HandleThing")]
internal class HandleThingPatch
{
    internal static void Prefix(out float __state, SomeController __instance) =>
        __state = __instance.Speed;

    internal static void Postfix(SomeController __instance, float __state, ref float __result) =>
        __result *= __state > 1f ? 2f : 1f;
}
```

### Guard a method entirely

```csharp
[HarmonyPatch(typeof(PlayerData), nameof(PlayerData.Save))]
internal class BlockSavePatch
{
    internal static bool Prefix() => !PluginConfig.Instance.DisableSaving;
}
```

### Patching coroutines and async

The visible method only starts the state machine. To affect per-frame behavior, patch the compiler-generated `MoveNext`:

```csharp
// Type name comes from the decompiler; the generated state machine is what runs each frame.
[HarmonyPatch(typeof(SomeController.<SomeCoroutine>d__12), "MoveNext")]
internal class SomeCoroutineMoveNextPatch
{
    internal static void Postfix(SomeController.<SomeCoroutine>d__12 __instance) { /* per-frame work */ }
}
```

Inspect the decompiler for the generated type name; it changes when the method changes. Use this sparingly.

## Pitfalls

| Pitfall | Consequence | Avoid |
| --- | --- | --- |
| String method names | Silent no-op after a rename | `nameof`, or verify in ILSpy |
| Ambiguous overload | Wrong method patched | Pass explicit argument types |
| Throwing inside a patch | Breaks the game method and may crash | Wrap risky work in `try/catch`, log, and return the original path |
| Patching every frame with reflection | Frame drops | Cache `FieldAccessor`/delegates |
| Patching `Awake` from a mod that loads late | Never applied | Choose a hook point that runs after mod load |
| Assuming `__instance` exists | NullReference on static targets | Check the signature |
| Modifying `__result` in a prefix | Overwritten by the original | Change it in a postfix, or skip the original |
| Leaving patches installed on scene reload | Duplicate handlers | Unpatch on exit; remove event handlers |
| Transpiler assumptions | Breaks on game updates | Prefer prefix/postfix; add defensive matching |

## Verifying a patch

1. Confirm the class appears in the IPA console with `--verbose` and `--debug`.
2. Add a one-time log in the patch to prove invocation.
3. If nothing logs, verify the method signature in ILSpy and check that `PatchAll` ran after the assembly loaded.
4. Look for Harmony warnings in the log; failed patches usually produce an exception or a "patch not applied" message.
