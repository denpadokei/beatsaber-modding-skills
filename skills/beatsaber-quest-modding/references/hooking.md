# Quest: Hooking with beatsaber-hook

Canonical page: <https://bsmg.wiki/modding/quest/intro.html#hooking> · beatsaber-hook: <https://github.com/QuestPackageManager/beatsaber-hook>

Hooking intercepts a game method so your code runs before, after, or instead of it. `beatsaber-hook` wraps il2cpp and thunk creation so a hook is a macro plus one install call.

## How types are named

`bs-cordl` generates headers under `extern/includes/codegen`. They mirror the C# namespaces:

```cpp
#include "GlobalNamespace/StandardLevelDetailViewController.hpp"  // C#: GlobalNamespace.StandardLevelDetailViewController
#include "HMUI/CurvedTextMeshPro.hpp"                              // C#: HMUI.CurvedTextMeshPro
#include "UnityEngine/UI/Button.hpp"                               // C#: UnityEngine.UI.Button
```

If you only own the Quest version, these headers are your decompiler. If you own the PC version, an ILSpy/dnSpy browse of the same game version is easier to read, but the generated names must still match the codegen.

## Install sequence

```cpp
MOD_EXTERN_FUNC void late_load() noexcept {
    il2cpp_functions::Init();   // required before any il2cpp/hook work

    PaperLogger.info("Installing hooks...");
    INSTALL_HOOK(PaperLogger, MyHook);
    PaperLogger.info("Installed all hooks!");
}
```

`setup()` is too early. Do not install hooks before `il2cpp_functions::Init()`.

## `MAKE_HOOK_MATCH`

```cpp
MAKE_HOOK_MATCH(HookName,
    &Namespace::Class::Method, ReturnType,
    Namespace::Class* self, /* original arguments... */) {

    HookName(self, /* arguments... */);   // call the original

    // your code
}
```

Macro arguments:

| Position | Meaning |
| --- | --- |
| 1 | Hook variable name |
| 2 | Pointer to the target method |
| 3 | Return type |
| 4 | Target instance pointer (`self`) |
| 5+ | The original parameter list, exactly |

The hook function **must** match the target signature. A mismatch corrupts the stack or crashes on install.

## Example: change the level-detail play button

```cpp
#include "GlobalNamespace/StandardLevelDetailView.hpp"
#include "GlobalNamespace/StandardLevelDetailViewController.hpp"
#include "UnityEngine/UI/Button.hpp"
#include "UnityEngine/GameObject.hpp"
#include "HMUI/CurvedTextMeshPro.hpp"

MAKE_HOOK_MATCH(LevelUIHook,
    &GlobalNamespace::StandardLevelDetailViewController::DidActivate, void,
    GlobalNamespace::StandardLevelDetailViewController* self,
    bool firstActivation, bool addedToHierarchy, bool screenSystemEnabling) {

    LevelUIHook(self, firstActivation, addedToHierarchy, screenSystemEnabling);

    auto* detailView = self->_standardLevelDetailView;
    auto* button = detailView->actionButton;
    auto* text = button->get_gameObject()->GetComponentInChildren<HMUI::CurvedTextMeshPro*>();
    text->set_text("Skill Issue");
}
```

Notes:

- Fields like `_standardLevelDetailView` are the generated names for private C# fields and are usually accessible without reflection.
- Unity accessors are `get_`/`set_` methods (`get_gameObject()`, `set_text(...)`).
- `auto*` is fine; explicit types make signatures easier to audit.

## Calling the original

- Call the original at the start for "postfix" behavior.
- Call it at the end for "prefix" behavior.
- Skip it to replace behavior entirely.
- Do not call it twice unless the game can tolerate duplicate side effects.

For non-void methods, return the original call or your replacement:

```cpp
MAKE_HOOK_MATCH(GetSpeedHook, &GlobalNamespace::SomeController::GetSpeed, float,
    GlobalNamespace::SomeController* self) {
    float speed = GetSpeedHook(self);
    return speed * 1.5f;   // replace with your own config-driven logic
}
```

## Static methods and constructors

- Static target: omit `self` and mirror only the original parameters.
- Constructor: target the generated `ctor` (verify the exact symbol in the codegen header). Constructor hooks are easy to get wrong; prefer hooking the method that constructs or initializes the object when possible.
- Generic methods and overloads: verify the exact instantiated signature in codegen; `MAKE_HOOK_MATCH` cannot infer it.

beatsaber-hook also offers match-by-offset and find-by-name macros for cases where the generated pointer is unavailable. Prefer `MAKE_HOOK_MATCH`; use the others only when you have verified the symbol and understand the version coupling.

## Hook ordering

- Multiple mods can hook the same method. The last installed hook becomes the entry point and calls the previous one through its trampoline, so behavior is order-dependent.
- Keep one hook per mod per method, and call the original exactly once.
- Avoid installing hooks conditionally on frame timing; do it in `late_load()`.

## Finding the right method

1. Search the codegen headers for the class (`grep -R "class SomeController" extern/includes/codegen`).
2. Read the method declaration and surrounding fields.
3. Cross-check behavior in a PC decompile of the same game version if available.
4. Log a unique string from the hook and confirm it appears with `qpm s logcat -self`.

## Crash and no-op causes

| Symptom | Cause |
| --- | --- |
| Game crashes immediately after installing the mod | Hook signature mismatch, or `INSTALL_HOOK` before `il2cpp_functions::Init()` |
| Hook never logs | Wrong method/overload, hook in `setup()` instead of `late_load()`, or codegen version mismatch |
| Crash when the hooked method runs | Null field access, wrong argument types, or calling the original with modified arguments of the wrong type |
| Works in one scene, crashes in another | The object or field does not exist in every mode/scene |
| Mod loads, but nothing changes | Another mod's hook replaces yours, or your replacement returns too early |

When a hook crashes, the tombstone is the fastest path to the faulting frame:

```powershell
qpm s tomb -analyze
qpm s stack
```

See [build-test-debug.md](build-test-debug.md).

## Safety rules

- Match the exact game version used for codegen.
- Validate every pointer before dereferencing; fields can be null during scene transitions.
- Do not allocate heavily or call Unity APIs off the main thread from a hook.
- Do not hook a method you cannot identify with certainty. A bad hook is a boot-loop.
