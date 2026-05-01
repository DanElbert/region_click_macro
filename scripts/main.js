import { ClickMacroBehaviorType, CLICK_EVENT_NAME } from "./click-macro-behavior.js";

const MODULE_ID = "region-click-macro";
const SUBTYPE = "clickMacro";
const FULL_TYPE = `${MODULE_ID}.${SUBTYPE}`;

Hooks.once("init", () => {
  CONFIG.RegionBehavior.dataModels[FULL_TYPE] = ClickMacroBehaviorType;
  CONFIG.RegionBehavior.typeIcons ??= {};
  CONFIG.RegionBehavior.typeIcons[FULL_TYPE] = "fa-solid fa-arrow-pointer";
});

Hooks.once("setup", () => {
  if (typeof libWrapper === "undefined") {
    ui.notifications?.error("Region Click Macro requires the libWrapper module.");
    return;
  }
  libWrapper.register(
    MODULE_ID,
    "foundry.canvas.layers.InteractionLayer.prototype._onClickLeft",
    onLayerClickLeft,
    "WRAPPER"
  );
});

function onLayerClickLeft(wrapped, event) {
  const result = wrapped(event);
  try {
    if (this !== canvas.regions) {
      void dispatchRegionClicks(event);
    }
  } catch (err) {
    console.error(`${MODULE_ID} | Error dispatching region click`, err);
  }
  return result;
}

async function dispatchRegionClicks(event) {
  const scene = canvas?.scene;
  if (!scene) return;

  const origin = event?.interactionData?.origin
    ?? event?.getLocalPosition?.(canvas.stage);
  if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) return;
  const point = { x: origin.x, y: origin.y };

  const targets = [];
  for (const regionDoc of scene.regions) {
    if (!regionHasClickMacroBehavior(regionDoc)) continue;
    if (!regionContainsPoint(regionDoc, point)) continue;
    targets.push(regionDoc);
  }
  if (!targets.length) return;

  const regionEvent = {
    name: CLICK_EVENT_NAME,
    data: { point, user: game.user, originalEvent: event },
    user: game.user
  };

  for (const regionDoc of targets) {
    try {
      await regionDoc._handleEvent({ ...regionEvent, region: regionDoc });
    } catch (err) {
      console.error(`${MODULE_ID} | Error handling click on region ${regionDoc.name}`, err);
    }
  }
}

function regionHasClickMacroBehavior(regionDoc) {
  for (const behavior of regionDoc.behaviors) {
    if (behavior.type === FULL_TYPE && !behavior.disabled) return true;
  }
  return false;
}

function regionContainsPoint(regionDoc, point) {
  const placeable = regionDoc.object;
  if (placeable && typeof placeable.testPoint === "function") {
    try { return !!placeable.testPoint(point); } catch (_) {}
  }
  if (typeof regionDoc.testPoint === "function") {
    try { return !!regionDoc.testPoint(point); } catch (_) {}
    try { return !!regionDoc.testPoint({ x: point.x, y: point.y, elevation: 0 }); } catch (_) {}
  }
  if (placeable?.polygons?.length) {
    for (const poly of placeable.polygons) {
      if (poly.contains?.(point.x, point.y)) return true;
    }
    return false;
  }
  if (placeable?.shape?.contains) {
    return !!placeable.shape.contains(point.x, point.y);
  }
  return false;
}
