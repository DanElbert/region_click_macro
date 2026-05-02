# Maintenance notes

Things most likely to break on Foundry updates, in roughly descending order of risk.

## 1. `canvas.mouseInteractionManager.callbacks.clickLeft` patch
**Where:** `scripts/main.js:14-31`

This is the central interception. We replace the `clickLeft` callback on the canvas-level MIM. Foundry refactored canvas click handling between v12→v13 (moved off `Canvas.prototype._onClickLeft`, which no longer exists in v14) and again between v13→v14. If they refactor again — particularly if they:

- Rename the action key (`clickLeft` → something else),
- Restructure `callbacks` (e.g., to a `Map` or method-based dispatcher),
- Remove the canvas-level singleton MIM in favor of per-layer dispatch,

…clicks will silently stop firing. Symptom: no `region-click-macro` log output and no error. To debug after an update, log `Object.keys(canvas.mouseInteractionManager?.callbacks ?? {})` at `canvasReady` and confirm `clickLeft` is still there.

## 2. Direct call to `behavior._handleRegionEvent`
**Where:** `scripts/main.js:53`

`_handleRegionEvent` on the RegionBehavior document is annotated `@internal` in Foundry source (`client/documents/region-behavior.mjs:100`). We bypass `regionDoc._handleEvent` (which filters by `b.active`, excluding hidden regions) and call this directly. If Foundry:

- Renames the method,
- Tightens visibility (e.g., to `#private`),
- Changes the event-shape (`{name, data, region, user}`),

…dispatch breaks. Foundry could also remove the static `events` record dispatch (the `if (event.name in system.constructor.events)` branch), which would silently make our handler stop firing.

## 3. Static `events` record on `RegionBehaviorType`
**Where:** `scripts/click-macro-behavior.js:29-31`

We register the click handler as `static events = { regionClickLeft: handler }`. This is a documented pattern for region behaviors but the dispatch path is `@internal`. The instance-level alternative (`_handleRegionEvent` override) is gated on `system.events.has(event.name)`, which we don't satisfy because we skip the parent's events SetField. If the static path is removed, we need to add the events SetField with our event name preloaded (see "Likely fix" below).

## 4. `regionDoc.polygonTree.testPoint(point)` for hit-testing
**Where:** `scripts/main.js:48`

`polygonTree` is a public getter on RegionDocument and `testPoint` is a stable 2D check, but: `RegionDocument#testPoint(point)` (note: not the polygonTree's) requires `point.elevation` and gates on the region's elevation range. We deliberately use `polygonTree.testPoint` to avoid the elevation gate. If `polygonTree` is renamed/restructured (e.g., merged into the document API and the 2D-only entry point disappears), we'd need to compute elevation from somewhere — probably default to the region's `elevation.bottom`.

## 5. `event.interactionData?.origin` for world coordinates
**Where:** `scripts/main.js:37`

Foundry populates `interactionData` on canvas pointer events with `origin` as world coords. The fallback `event.getLocalPosition(canvas.stage)` is a PIXI primitive and stable. If `interactionData.origin` is renamed, the fallback should still work — but only if `event` is still a PIXI FederatedEvent.

## 6. Subtype registration / localization keys
**Where:** `module.json:26-30`, `lang/en.json:2`, `scripts/main.js:9`

The contract `documentTypes.RegionBehavior.clickMacro` ↔ `CONFIG.RegionBehavior.dataModels["region-click-macro.clickMacro"]` ↔ `TYPES.RegionBehavior.region-click-macro.clickMacro` is convention-bound. Foundry has occasionally adjusted subtype key formats. Symptom of breakage: behavior shows up as "Unknown" in the dropdown, or doesn't appear at all.

## 7. `canvas.activeLayer === canvas.regions` skip
**Where:** `scripts/main.js:25`

We skip dispatch when the regions edit layer is active so clicks during region editing don't fire macros. If `canvas.regions` is renamed or `activeLayer` becomes a string instead of a layer reference, the comparison silently fails — and in this case the failure mode is "macros fire while you're editing regions," which is annoying but not catastrophic.

## Likely fixes if dispatch breaks (#2 or #3)

If the static `events` route stops working, the fallback is to put the event in the instance `events` Set so the `_handleRegionEvent` instance path fires:

```js
static defineSchema() {
  return {
    ...super.defineSchema(),  // brings in the events SetField
    uuid: ...,
    triggerPermission: ...
  };
}
// then ensure new behaviors have CLICK_EVENT_NAME in their events Set
// (either via initial value on _createEventsField, or migration)
```

…and override `_handleRegionEvent` on the instance.
