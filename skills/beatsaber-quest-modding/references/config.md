# Quest: Configuration with config-utils

Canonical page: <https://bsmg.wiki/modding/quest/config.html>

`config-utils` generates a typed config backed by a JSON file. Declare values once, initialize once, then get/set.

## Install

```powershell
qpm dependency add config-utils
qpm restore
```

`beatsaber-hook` already includes config-utils headers, but declare the dependency explicitly so QPM resolves it.

## Declare

`include/modconfig.hpp`:

```cpp
#pragma once

#include "config-utils/shared/config-utils.hpp"
#include "UnityEngine/Color.hpp"
#include "UnityEngine/Vector2.hpp"
#include "UnityEngine/Vector3.hpp"
#include "UnityEngine/Vector4.hpp"

DECLARE_CONFIG(ModConfig,
    CONFIG_VALUE(Enabled, bool, "Enabled", true);
    CONFIG_VALUE(Volume, float, "Volume", 0.8f);
    CONFIG_VALUE(Label, std::string, "Label", "default");
    CONFIG_VALUE(Count, int, "Count", 3);
    CONFIG_VALUE(Scale, double, "Scale", 0.5);
    CONFIG_VALUE(Tint, UnityEngine::Color, "Tint", UnityEngine::Color(1.0f, 0.5f, 0.0f, 1.0f));
    CONFIG_VALUE(Offset, UnityEngine::Vector2, "Offset", UnityEngine::Vector2(0, 0));
    CONFIG_VALUE(Position, UnityEngine::Vector3, "Position", UnityEngine::Vector3(0, 1, 2));
    CONFIG_VALUE(Bounds, UnityEngine::Vector4, "Bounds", UnityEngine::Vector4(1, 1, 1, 1));
)
```

`CONFIG_VALUE(Name, Type, "Display name", default)`

Supported types: `bool`, `int`, `float`, `double`, `std::string`, `UnityEngine::Color`, `Vector2`, `Vector3`, `Vector4`.

`UnityEngine::Color` components are `0..1`, not `0..255`.

## Initialize

```cpp
#include "modconfig.hpp"

MOD_EXTERN_FUNC void late_load() noexcept {
    il2cpp_functions::Init();
    getModConfig().Init(modInfo);   // must run before any GetValue/SetValue
}
```

`Init` also loads the file from disk. Calling `GetValue` first crashes.

`modInfo` is the `modloader::ModInfo` defined in `main.cpp`.

## Read and write

```cpp
bool enabled = getModConfig().Enabled.GetValue();
getModConfig().Enabled.SetValue(true);          // saves the file immediately

auto color = getModConfig().Tint.GetValue();
color.a = 0.5f;
getModConfig().Tint.SetValue(color);
```

Every `SetValue` writes the JSON file. Do not call it per frame; batch changes or only write on user action.

## Where the file lives

```text
/sdcard/ModData/com.beatgames.beatsaber/Configs/<mod-id>.json
```

On a PC with ADB:

```powershell
adb pull /sdcard/ModData/com.beatgames.beatsaber/Configs/myquestmod.json
```

If values do not persist:

1. Confirm `Init` ran (add a log after it).
2. Confirm the mod ID is stable; changing it creates a new file.
3. Check that the config file is valid JSON; a corrupted file may fail to load.
4. Confirm the mod has write access to `ModData` (it should, under the default install).

## Common patterns

### Migrating a config

Add new values with defaults; existing files get the default on load. Do not rename values casually — the old key is simply ignored and users lose their setting. If a rename is necessary, read the old key once and write the new one.

### Thread safety

Config access is not a synchronization primitive. Read values on the main thread, or copy them into atomics when a hook runs on another thread.

### Sharing a config across source files

Include `modconfig.hpp`; `getModConfig()` returns the same static instance.

### Defaults that depend on runtime state

`CONFIG_VALUE` defaults must be compile-time constants. Compute the effective value at the point of use instead:

```cpp
float volume = getModConfig().Volume.GetValue() * getDefaultVolume();
```

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Crash at startup | `GetValue` before `Init` | Call `getModConfig().Init(modInfo)` in `late_load()` |
| Values reset every launch | Init failed or file is not writable | Log after `Init`, check the Configs folder |
| Wrong colors | `0..255` passed to `Color` | Divide by 255 |
| Stutter when changing a slider | `SetValue` every frame | Save on release, or use a debounce |
| Config not found for another mod | Wrong mod ID | Use the ID from that mod's `mod.json` |

Starter header: [`../assets/modconfig.hpp.txt`](../assets/modconfig.hpp.txt).
