import { ClickMacroBehaviorType, CLICK_EVENT_NAME } from "./click-macro-behavior.js";
import { log } from "./log.js";

const MODULE_ID = "region-click-macro";
const SUBTYPE = "clickMacro";
const FULL_TYPE = `${MODULE_ID}.${SUBTYPE}`;

Hooks.once("init", () => {
  CONFIG.RegionBehavior.dataModels[FULL_TYPE] = ClickMacroBehaviorType;
  CONFIG.RegionBehavior.typeIcons ??= {};
  CONFIG.RegionBehavior.typeIcons[FULL_TYPE] = "fa-solid fa-arrow-pointer";
});

Hooks.on("canvasReady", () => {
  const callbacks = canvas.mouseInteractionManager?.callbacks;
  if (!callbacks?.clickLeft) {
    log.warn("canvas MouseInteractionManager has no clickLeft callback; clicks will not fire");
    return;
  }
  if (callbacks._regionClickWrapped) return;

  const original = callbacks.clickLeft;
  callbacks.clickLeft = function(event) {
    const result = original.apply(this, arguments);
    if (canvas.activeLayer !== canvas.regions) {
      dispatchRegionClicks(event).catch(err => log.error("dispatch failed", err));
    }
    return result;
  };
  callbacks._regionClickWrapped = true;
});

async function dispatchRegionClicks(event) {
  const scene = canvas?.scene;
  if (!scene) return;

  const origin = event?.interactionData?.origin ?? event?.getLocalPosition?.(canvas.stage);
  if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) return;
  const point = { x: origin.x, y: origin.y };

  const regionEvent = {
    name: CLICK_EVENT_NAME,
    data: { point, user: game.user, originalEvent: event },
    user: game.user
  };

  for (const regionDoc of scene.regions) {
    if (!regionDoc.polygonTree?.testPoint(point)) continue;
    for (const behavior of regionDoc.behaviors) {
      if (behavior.type !== FULL_TYPE) continue;
      if (behavior.disabled) continue;
      try {
        await behavior._handleRegionEvent({ ...regionEvent, region: regionDoc });
      } catch (err) {
        log.error(`error handling click on region "${regionDoc.name}"`, err);
      }
    }
  }
}
