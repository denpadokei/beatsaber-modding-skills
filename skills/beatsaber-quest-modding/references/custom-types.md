# Quest: Custom Types

Canonical page: <https://bsmg.wiki/modding/quest/custom-types.html> · FAQ: <https://github.com/sc2ad/Il2CppQuestTypePatching/wiki/FAQ>

`custom-types` creates C#-equivalent types from C++ macros. They can inherit `MonoBehaviour`, implement interfaces, override virtual methods, own Unity fields, and run coroutines. The game's il2cpp runtime sees them as real managed types.

## Install

```powershell
qpm dependency add custom-types
qpm restore
```

Include the macro header in every type header:

```cpp
#pragma once
#include "custom-types/shared/macros.hpp"
#include "UnityEngine/MonoBehaviour.hpp"
```

## Declare a type

```cpp
DECLARE_CLASS_CODEGEN(MyNamespace, Counter, UnityEngine::MonoBehaviour,
    DECLARE_INSTANCE_METHOD(void, Update);
    DECLARE_INSTANCE_FIELD(int, counts);
)
```

Equivalent C#:

```csharp
namespace MyNamespace
{
    public class Counter : MonoBehaviour
    {
        public int counts;
        public void Update() { }
    }
}
```

Only C#-compatible types can appear in `DECLARE_INSTANCE_FIELD` and method parameters. Put C++-only members (`std::vector`, structs) after the C# members using normal C++ syntax.

## Define it

`src/Counter.cpp`:

```cpp
#include "Counter.hpp"

DEFINE_TYPE(MyNamespace, Counter);

void MyNamespace::Counter::Update() {
    counts += 5;
}
```

The `DEFINE_TYPE` macro must appear once, in exactly one translation unit.

## Override a virtual method

Only `virtual`/`abstract` methods can be overridden. You need the original `MethodInfo*`:

```cpp
#include "HMUI/ViewController.hpp"

DECLARE_CLASS_CODEGEN(MyNamespace, CustomMenu, HMUI::ViewController,
    DECLARE_OVERRIDE_METHOD(void, DidActivate,
        il2cpp_utils::il2cpp_type_check::MetadataGetter<&HMUI::ViewController::DidActivate>::get(),
        bool firstActivation, bool addedToHierarchy, bool screenSystemEnabling);
)
```

Alternative lookup when the metadata getter is unavailable:

```cpp
DECLARE_OVERRIDE_METHOD(void, DidActivate,
    il2cpp_utils::FindMethodUnsafe("HMUI", "ViewController", "DidActivate", 3),
    bool firstActivation, bool addedToHierarchy, bool screenSystemEnabling);
```

These look like global calls, but the macros wrap them in registration functions that run at the right time.

If a method is not virtual in the C# source, overriding it is not possible. Hook it instead.

## Interfaces

Putting an interface as the parent does not work. Use the interfaces variant:

```cpp
#include "HMUI/TableView_IDataSource.hpp"

DECLARE_CLASS_CODEGEN_INTERFACES(MyNamespace, TableData, Il2CppObject,
    { classof(HMUI::TableView_IDataSource*) },
    // members
)
```

- Use `Il2CppObject` when there is no base class.
- Wrap multiple interfaces in `std::vector<Il2CppClass*>({ ... })` so the macro expands correctly.

## Constructors and destructors

```cpp
DECLARE_CLASS_CODEGEN(MyNamespace, Counter, UnityEngine::MonoBehaviour,
    DECLARE_CTOR(ctor);
    DECLARE_INSTANCE_FIELD(int, counts);
)
```

```cpp
void MyNamespace::Counter::ctor() {
    INVOKE_BASE_CTOR(classof(UnityEngine::MonoBehaviour*));
    counts = 0;
}
```

- Always invoke the base constructor for non-trivial base types. `MonoBehaviour` itself does nothing, but other bases may.
- With C++ default-initialized members, `DECLARE_DEFAULT_CTOR()` generates a constructor that calls `INVOKE_CTOR()`.
- Destructors: `DECLARE_DTOR` / `DECLARE_SIMPLE_DTOR`. You do not need to call the base destructor.
- **Never** call `ctor` directly or `new` the type. Create it with:

```cpp
auto* counter = MyNamespace::Counter::New_ctor();
// or
auto* counter = il2cpp_utils::New<MyNamespace::Counter*>(args...);
gameObject->AddComponent<MyNamespace::Counter*>();
```

## Register

```cpp
#include "custom-types/shared/register.hpp"

MOD_EXTERN_FUNC void late_load() noexcept {
    il2cpp_functions::Init();
    custom_types::Register::AutoRegister();   // before INSTALL_HOOK
    // INSTALL_HOOK(...)
}
```

Order matters: register types **before** installing hooks. A hook that references an unregistered type can crash.

## Using the type

Custom types behave like game types:

```cpp
#include "UnityEngine/GameObject.hpp"
#include "Counter.hpp"

auto* go = UnityEngine::GameObject::New_ctor("CounterObject");
go->AddComponent<MyNamespace::Counter*>();
```

## Coroutines

```cpp
#include "custom-types/shared/coroutine.hpp"
#include "UnityEngine/WaitForSeconds.hpp"
#include "System/Collections/IEnumerator.hpp"

custom_types::Helpers::Coroutine MyCoroutine() {
    for (int i = 0; i < 30; i++) {
        co_yield reinterpret_cast<System::Collections::IEnumerator*>(
            UnityEngine::WaitForSeconds::New_ctor(1));
    }
    co_return;
}
```

| C# | C++ |
| --- | --- |
| `yield return x` | `co_yield x` |
| `yield return null` | `co_yield nullptr` |
| `yield break` | `co_return` |

`co_return` is mandatory at the end; a normal `return` does not compile as a coroutine exit.

Start it on a MonoBehaviour:

```cpp
auto* runner = go->AddComponent<MyNamespace::Counter*>();
runner->StartCoroutine(custom_types::Helpers::CoroutineHelper::New(MyCoroutine()));
```

Or without an instance:

```cpp
#include "GlobalNamespace/SharedCoroutineStarter.hpp"

GlobalNamespace::SharedCoroutineStarter::get_instance()->StartCoroutine(
    custom_types::Helpers::CoroutineHelper::New(MyCoroutine()));
```

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Crash on `AutoRegister` | Type references an unknown base or interface | Verify the base type exists in this game version |
| Override never runs | Method is not virtual, or wrong `MethodInfo*` | Check the C# declaration; use a hook instead |
| `NullReferenceException` in the constructor | Base constructor not invoked | `INVOKE_BASE_CTOR(...)` |
| Object behaves like a plain C++ object | Created with `new` | Use `New_ctor` / `il2cpp_utils::New` |
| Hook crashes only when the custom type is involved | Hooks installed before registration | Register first, then install hooks |
| Coroutine stops immediately | Missing `co_return`, or wrong cast on `co_yield` | Add `co_return`, cast to `IEnumerator*` |
| Field values are garbage | C++ member placed before C# fields | Declare all C# fields first, then C++ members |

## When not to use custom types

- A single hook is enough.
- You only need a value holder: use a config or a static.
- You need a UI screen: BSML can register a plain `DidActivate` callback without a custom type.

Custom types are powerful but add registration and lifetime complexity. Use them when the game genuinely needs a managed object.

Starter header: [`../assets/CustomType.hpp.txt`](../assets/CustomType.hpp.txt).
