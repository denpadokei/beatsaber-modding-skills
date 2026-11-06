# Quest: BSML User Interfaces

Canonical page: <https://bsmg.wiki/modding/quest/ui.html> · Docs: <https://redbrumbler.github.io/Quest-BSML-Docs/>

Quest BSML provides two ways to build UI:

- **BSML-Lite** — C++ helpers that create components directly.
- **BSML XML** — `.bsml` resources parsed at runtime, closer to the PC workflow.

Lite is the common path for settings pages because it avoids embedding and parsing resources.

## Install

```powershell
qpm dependency add bsml
qpm dependency add custom-types
qpm restore
```

`custom-types` is required by BSML even if your mod does not declare its own types.

## Initialize

```cpp
#include "bsml/shared/BSML.hpp"

MOD_EXTERN_FUNC void late_load() noexcept {
    il2cpp_functions::Init();
    custom_types::Register::AutoRegister();
    BSML::Init();

    BSML::Register::RegisterMainMenuViewControllerMethod(
        "My Mod", "Settings for My Mod", "My Mod", DidActivate);

    // install hooks after registration
}
```

`BSML::Init()` must run after `il2cpp_functions::Init()` and before any registration.

## `DidActivate`

BSML calls your method when the page is shown:

```cpp
#include "bsml/shared/BSML.hpp"

void DidActivate(HMUI::ViewController* self, bool firstActivation,
                 bool addedToHierarchy, bool screenSystemEnabling) {
    if (!firstActivation) return;

    auto* container = BSML::Lite::CreateScrollableSettingsContainer(self->get_transform());
    BSML::Lite::CreateText(container->get_transform(), "Hello World!");
}
```

Rules:

- Create components only when `firstActivation` is true; otherwise they duplicate on every open.
- Use a container (`CreateScrollableSettingsContainer`, horizontal/vertical layouts) to control placement.
- Keep references to components you need to update later; the tree is rebuilt per activation.

## Registration points

| Location | Registration |
| --- | --- |
| Main menu view controller | `BSML::Register::RegisterMainMenuViewControllerMethod(title, buttonText, hoverHint, DidActivate)` |
| Mod settings | `BSML::Register::RegisterSettingsMenu(name, DidActivate, true)` |
| Gameplay setup | `BSML::Register::RegisterGameplaySetupTab(name, DidActivate)` with `void(GameObject* self, bool firstActivation)` |
| Left menu button | `BSML::Register::RegisterMenuButton(text, hoverHint, onClick)` |

The gameplay setup callback signature is `void(UnityEngine::GameObject* self, bool firstActivation)` — there is no view controller.

Registration APIs have changed across BSML versions. Check `extern/includes/bsml/shared/BSML.hpp` for the exact overloads in your build; the signatures above match current BSML.

## BSML-Lite components

| Helper | Produces |
| --- | --- |
| `CreateScrollableSettingsContainer(transform)` | Scroll view suitable for settings |
| `CreateVerticalLayoutGroup(transform, ...)` | Vertical stack |
| `CreateHorizontalLayoutGroup(transform, ...)` | Horizontal row |
| `CreateGridLayoutGroup(transform, ...)` | Grid |
| `CreateText(transform, "text", fontSize)` | Text label |
| `CreateUIButton(transform, "text", onClick)` | Button |
| `CreateToggle(transform, "label", value, onToggle)` | Toggle |
| `CreateSliderSetting(transform, "label", increment, value, min, max, onValueChange)` | Slider |
| `CreateIncrementSetting(transform, "label", ...)` | Increment/decrement control |
| `CreateStringSetting(transform, "label", value, onValueChange)` | Text input |
| `CreateDropdown(transform, ...)` | Dropdown |
| `CreateColorPicker(transform, ...)` | Color picker |
| `CreateProgressBar(transform, ...)` | Progress bar |
| `CreateFloatingScreen(...)` | World-space screen |

The `BSML-Lite/Creation` headers document nearly every helper and its overloads. Read them in `extern/includes/bsml/` rather than guessing.

### Wiring config values

```cpp
void DidActivate(HMUI::ViewController* self, bool firstActivation,
                 bool addedToHierarchy, bool screenSystemEnabling) {
    if (!firstActivation) return;

    auto* container = BSML::Lite::CreateScrollableSettingsContainer(self->get_transform());

    BSML::Lite::CreateToggle(container->get_transform(), "Enable feature",
        getModConfig().Enabled.GetValue(),
        [](bool value) { getModConfig().Enabled.SetValue(value); });

    BSML::Lite::CreateSliderSetting(container->get_transform(), "Volume",
        0.05f, getModConfig().Volume.GetValue(), 0.0f, 1.0f,
        [](float value) { getModConfig().Volume.SetValue(value); });
}
```

`SetValue` writes the config file. `CreateSliderSetting`'s `applyValueTime` argument defaults to 1 second, which limits write frequency; for other controls, debounce if the callback fires continuously.

## XML views

BSML also parses `.bsml` XML. The Quest docs list the supported tags and attributes:

- <https://redbrumbler.github.io/Quest-BSML-Docs/>
- Embed the resource, then load it through the BSML API for the target screen.

Use XML when porting a PC view or when the layout is complex. Use Lite for small settings pages — it is easier to debug without resource-path issues.

## Sizing and layout

- Default UI scale is small; use layout groups instead of absolute positions.
- `child-expand-height` / `child-control-height` behave differently than PC BSML. Check the Quest docs.
- Test in the actual headset. A layout that looks fine in a flat preview can be unreadable at VR distance.
- Avoid deep nesting; il2cpp UI creation is more expensive than on PC.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Nothing appears in the menu | `BSML::Init()` missing, or registration after hooks | Init first, register before installing hooks |
| Duplicate widgets | Components created when `firstActivation` is false | Guard with `firstActivation` |
| Crash in `CreateScrollableSettingsContainer` | Wrong parent transform or BSML not initialized | Pass `self->get_transform()`, check init order |
| Gameplay tab crashes | Used the view-controller signature | Use `void(GameObject*, bool)` |
| Text/toggle does not persist | Callback does not write config | Call `SetValue` in the callback |
| UI works once, then breaks after reopening | Stale component pointers | Rebuild on activation; do not cache Unity objects across scenes |
| Unresolved BSML symbols | Wrong BSML version for this game build | Install the BSML version matching the codegen |
