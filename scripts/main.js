import { ClickMacroBehaviorType, CLICK_EVENT_NAME } from "./click-macro-behavior.js";

const MODULE_ID = "region-click-macro";
const SUBTYPE = "clickMacro";
const FULL_TYPE = `${MODULE_ID}.${SUBTYPE}`;

Hooks.once("init", () => {
  CONFIG.RegionBehavior.dataModels[FULL_TYPE] = ClickMacroBehaviorType;
  CONFIG.RegionBehavior.typeIcons ??= {};
  CONFIG.RegionBehavior.typeIcons[FULL_TYPE] = "fa-solid fa-arrow-pointer";
});

Hooks.on("canvasReady", () => {
  const stage = canvas?.stage;
  if (!stage) return;
  stage.off("pointertap", onCanvasPointerTap);
  stage.on("pointertap", onCanvasPointerTap);
});

function onCanvasPointerTap(event) {
  if (event.button !== undefined && event.button !== 0) return;
  if (canvas.activeLayer === canvas.regions) return;

  const local = event.getLocalPosition(canvas.stage);
  const point = { x: local.x, y: local.y };

  void dispatchRegionClicks(point, event);
}

async function dispatchRegionClicks(point, originalEvent) {
  const scene = canvas?.scene;
  if (!scene) return;

  const targets = [];
  for (const regionDoc of scene.regions) {
    if (!regionHasClickMacroBehavior(regionDoc)) continue;
    if (!regionContainsPoint(regionDoc, point)) continue;
    targets.push(regionDoc);
  }
  if (!targets.length) return;

  const regionEvent = {
    name: CLICK_EVENT_NAME,
    data: { point, user: game.user, originalEvent },
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
  if (placeable?.shape?.contains) {
    return placeable.shape.contains(point.x, point.y);
  }
  if (typeof regionDoc.testPoint === "function") {
    return regionDoc.testPoint({ x: point.x, y: point.y, elevation: 0 });
  }
  return false;
}
