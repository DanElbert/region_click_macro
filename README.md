# Region Click Macro

A Foundry VTT v14 module that adds an **Execute Macro on Click** region behavior. When a user left-clicks inside a region, a configured macro runs.

## Install

In Foundry's **Add-on Modules** tab, click **Install Module**, and paste this manifest URL:

```
https://raw.githubusercontent.com/DanElbert/region_click_macro/main/module.json
```

## Requirements

- Foundry VTT v14

## Usage

1. Edit a Scene Region.
2. Add a behavior of type **Execute Macro on Click**.
3. Drop a macro into the **Macro** field, or paste its UUID.
4. Choose **Trigger Permission** — which users' clicks fire the macro (default: All Users).

The macro receives the following scope variables:

- `event` — the region event (`event.data.user` is the clicker, `event.data.point` is `{x, y}` in world coordinates)
- `region` — the RegionDocument
- `behavior` — the RegionBehavior document

## Notes

- Clicks that hit a token, drawing, wall, or other interactive placeable do not trigger the behavior — only clicks on otherwise-empty canvas inside the region fire.
- GM clicks while the Region edit tool is active also do not trigger (the region layer claims them for editing).
- The macro executes on the clicking user's client. If you need GM-only execution, gate inside the macro with `if (!game.user.isGM) return;`.
