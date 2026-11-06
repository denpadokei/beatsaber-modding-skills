# PC: Zenject and SiraUtil

Canonical page: <https://bsmg.wiki/modding/pc/zenject.html> · SiraUtil: <https://github.com/Auros/SiraUtil>

Beat Saber uses [Zenject](https://github.com/Mathijs-Bakker/Extenject) (Extenject) for dependency injection. SiraUtil exposes the game's containers to mods so you can register services at the right scene scope instead of hunting for objects.

## When to use it

- The mod has state that must live for a scene (`Menu`, `Player`) or the whole app.
- You need references to game services (`PauseController`, `ScoreController`, `MainFlowCoordinator`, `MenuButtons`).
- You want Unity components and view controllers created and wired by the container.
- You are building more than a single Harmony patch.

For a one-off patch, plain Harmony is simpler. Do not add a container just to hold one static value.

## Setup

Add assembly references to `SiraUtil`, `Zenject`, and `Zenject-usage`, and declare `SiraUtil` in `DependsOn`.

```csharp
[Plugin(RuntimeOptions.SingleStartInit), NoEnableDisable]
internal class Plugin
{
    [Init]
    public Plugin(Logger logger, Zenjector zenjector)
    {
        zenjector.UseLogger(logger);
        zenjector.Install<AppInstaller>(Location.App);
        zenjector.Install<MenuInstaller>(Location.Menu);
        zenjector.Install<PlayerInstaller>(Location.StandardPlayer);
    }
}
```

`UseLogger` gives `SiraLog` instances a real source name; without it logs show `???`.

## Locations

| Location | Lifetime | Typical contents |
| --- | --- | --- |
| `Location.App` | Whole app, survives scene changes | Config services, caches, global managers |
| `Location.Menu` | Main menu scene | Menu buttons, settings view controllers, flow coordinators |
| `Location.Player` | Gameplay scene | Gameplay services, effect spawners, pools |
| `Location.StandardPlayer` | Standard solo/party gameplay | Same, when you specifically target standard play |

SiraUtil versions differ slightly in enum names. Check the SiraUtil release notes for the version you target.

Installers are ordinary Zenject installers:

```csharp
internal class MenuInstaller : Installer
{
    public override void InstallBindings()
    {
        Container.Bind<MenuButtonManager>().AsSingle();
        Container.BindInterfacesTo<SomeService>().AsSingle();
        Container.Bind<TutorialViewController>().FromNewComponentAsViewController().AsSingle();
        Container.Bind<TutorialFlowCoordinator>().FromNewComponentOnNewGameObject().AsSingle();
    }
}
```

## Binding cheat sheet

| Binding | Meaning |
| --- | --- |
| `Container.Bind<T>()` | Bind a concrete type |
| `.To<U>()` | Resolve `T` as `U` |
| `.AsSingle()` | One instance per container |
| `.AsTransient()` | New instance per resolution |
| `BindInterfacesTo<T>()` | Bind `T` to every interface it implements |
| `BindInterfacesAndSelfTo<T>()` | Interfaces plus concrete type |
| `.FromNewComponentOnNewGameObject()` | Create a GameObject and add the component |
| `.FromNewComponentAsViewController()` | Create a Beat Saber view controller properly parented |
| `.FromComponentInNewPrefab(prefab)` | Instantiate a prefab and bind its component |
| `.WithId("name")` | Named binding for multiple implementations |
| `BindMemoryPool<T, TPool>()` | Pool for frequently spawned effects |

```csharp
Container.BindMemoryPool<MissTextEffect, MissTextEffect.Pool>()
    .WithInitialSize(20)
    .FromComponentInNewPrefab(prefab);
```

Pools are the correct pattern for effects spawned per note. Creating and destroying GameObjects per hit will stutter.

## Injection styles

```csharp
// Constructor: preferred
internal class Service
{
    private readonly SiraLog log;
    public Service(SiraLog log) => this.log = log;
}

// Method
[Inject]
public void Construct(PauseController pauseController) { }

// Field/property
[Inject] private readonly ScoreController scoreController = null!;
```

Constructor injection is the most testable. Use method injection when a MonoBehaviour prevents constructor injection.

## Initialization and cleanup

- `IInitializable.Initialize()` runs after the object graph is built — use it instead of `Start()` for services.
- `IDisposable.Dispose()` runs when the owning container is disposed, which usually means scene unload.
- Unsubscribe events and release handles in `Dispose`. Scene-scoped objects are recreated on every scene load.
- Do not store menu-scene objects in an `App`-scoped singleton; they become stale after a restart.

## Zenject with UI

```csharp
zenjector.Install<MenuInstaller>(Location.Menu);
```

Bind the view controller through the container and inject it into the flow coordinator:

```csharp
internal class MenuInstaller : Installer
{
    public override void InstallBindings()
    {
        Container.Bind<TutorialViewController>().FromNewComponentAsViewController().AsSingle();
        Container.Bind<TutorialFlowCoordinator>().FromNewComponentOnNewGameObject().AsSingle();
        Container.BindInterfacesTo<MenuButtonManager>().AsSingle();
    }
}

internal class MenuButtonManager : IInitializable
{
    private readonly MenuButtons menuButtons;
    private readonly MainFlowCoordinator mainFlowCoordinator;
    private readonly TutorialFlowCoordinator tutorialFlowCoordinator;
    private readonly MenuButton button;

    public MenuButtonManager(MenuButtons menuButtons, MainFlowCoordinator mainFlowCoordinator,
        TutorialFlowCoordinator tutorialFlowCoordinator)
    {
        this.menuButtons = menuButtons;
        this.mainFlowCoordinator = mainFlowCoordinator;
        this.tutorialFlowCoordinator = tutorialFlowCoordinator;
        button = new MenuButton("Tutorial Mod", Show);
    }

    public void Initialize() => menuButtons.RegisterButton(button);

    private void Show() => mainFlowCoordinator.PresentFlowCoordinator(tutorialFlowCoordinator);
}
```

This avoids manual `Resources.FindObjectsOfTypeAll` lookups and makes the menu button appear only when the menu container exists.

### Custom BSML tags

```csharp
Container.Bind<BSMLTag>().To<MyCustomTag>().AsSingle();
Container.Bind<TypeHandler>().To<MyCustomHandler>().AsSingle();
```

## Affinity patching

SiraUtil's Affinity API lets Harmony patches be instance methods so they can receive injected services.

```csharp
internal class PauseOnMisses : IAffinity
{
    private readonly PauseController pauseController;
    private int misses;

    public PauseOnMisses(PauseController pauseController) => this.pauseController = pauseController;

    [AffinityPrefix]
    [AffinityPatch(typeof(ScoreController), nameof(ScoreController.HandleNoteWasMissed))]
    private bool HandleNoteWasMissedPrefix(NoteController noteController)
    {
        if (noteController.colorType == ColorType.None && misses++ < 10)
            return true;

        pauseController.Pause();
        misses = 0;
        return false;
    }
}
```

Bind it in the appropriate scope:

```csharp
Container.BindInterfacesTo<PauseOnMisses>().AsSingle();
```

Limitations:

- Affinity is maintained separately from Harmony and supports fewer features.
- Patches apply only after the object graph exists; you cannot patch `Awake` or constructors.
- Patches are removed when the binding's container is disposed.
- Default patch type is postfix if you omit `[AffinityPrefix]`/`[AffinityPostfix]`/`[AffinityTranspiler]`.

## Sabers and redecorating (brief)

SiraUtil provides a unified saber registration path so cosmetic mods do not fight over the same prefab, plus APIs for replacing note debris and other visual objects. Follow the wiki sections "Custom Sabers" and "Object Redecorating" if the task is cosmetic; do not hand-patch prefab creation when a SiraUtil API exists.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `ZenjectException: No binding found` | Type not bound in that scope | Bind it in the installer for the scene that uses it |
| Service is null after scene change | Cached a menu/player object in `App` scope | Re-resolve from the scene container or move the binding |
| Duplicate handlers after restart | Subscribed per scene without unsubscribing | Unsubscribe in `Dispose` or bind the handler per instance |
| Menu UI does not appear | Installer not registered at `Location.Menu` | Add the installer and rebuild |
| `SiraLog` source is `???` | `UseLogger` missing | Call `zenjector.UseLogger(logger)` |
| Pool never returns objects | Did not despawn completed effects | Despawn in the finish event |
| Patch never fires | Affinity patch bound too late | Bind in the scene where the target lives; do not target `Awake` |
