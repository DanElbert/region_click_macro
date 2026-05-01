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
    "foundry.canvas.Canvas.prototype._onClickLeft",
    onCanvasClickLeft,
    "WRAPPER"
  );
});

async function onCanvasClickLeft(wrapped, event) {
  const result = wrapped(event);
  try {
    await dispatchRegionClicks(event);
  } catch (err) {
    console.error(`${MODULE_ID} | Error dispatching region click`, err);
  }
  return result;
}

async function dispatchRegionClicks(event) {
  const scene = canvas?.scene;
  if (!scene) return;

  const point = event?.interactionData?.origin ?? canvas.mousePosition;
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;

  const targets = [];
  for (const regionDoc of scene.regions) {
    if (!regionHasClickMacroBehavior(regionDoc)) continue;
    if (!regionContainsPoint(regionDoc, point)) continue;
    targets.push(regionDoc);
  }
  if (!targets.length) return;

  const regionEvent = {
    name: CLICK_EVENT_NAME,
    data: { point: { x: point.x, y: point.y }, user: game.user, originalEvent: event },
    user: game.user
  };

  for (const regionDoc of targets) {
    await regionDoc._handleEvent({ ...regionEvent, region: regionDoc });
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
  if (placeable?.shape?.contains) {
    return placeable.shape.contains(point.x, point.y);
  }
  if (typeof regionDoc.testPoint === "function") {
    return regionDoc.testPoint({ x: point.x, y: point.y, elevation: 0 });
  }
  return false;
}
