import { log } from "./log.js";

const fields = foundry.data.fields;

export const CLICK_EVENT_NAME = "regionClickLeft";

async function handleClickEvent(event) {
  if (!this.uuid) return;

  const user = event.data?.user ?? game.user;
  if (!this.userCanTrigger(user)) return;

  const macro = await fromUuid(this.uuid);
  if (!macro) {
    log.warn(`macro ${this.uuid} not found for behavior ${this.parent?.uuid}`);
    return;
  }

  await macro.execute({
    event,
    region: this.parent?.region,
    behavior: this.parent
  });
}

export class ClickMacroBehaviorType extends foundry.data.regionBehaviors.RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["REGION_CLICK_MACRO.BEHAVIOR.ClickMacro"];

  static events = {
    [CLICK_EVENT_NAME]: handleClickEvent
  };

  static defineSchema() {
    return {
      uuid: new fields.DocumentUUIDField({ type: "Macro" }),
      triggerPermission: new fields.StringField({
        required: true,
        blank: false,
        initial: "ALL",
        choices: {
          ALL: "REGION_CLICK_MACRO.PERMISSION.ALL",
          PLAYER: "REGION_CLICK_MACRO.PERMISSION.PLAYER",
          TRUSTED: "REGION_CLICK_MACRO.PERMISSION.TRUSTED",
          ASSISTANT: "REGION_CLICK_MACRO.PERMISSION.ASSISTANT",
          GAMEMASTER: "REGION_CLICK_MACRO.PERMISSION.GAMEMASTER"
        }
      })
    };
  }

  userCanTrigger(user) {
    if (!user) return false;
    if (this.triggerPermission === "ALL") return true;
    const minRole = CONST.USER_ROLES[this.triggerPermission];
    return minRole !== undefined && user.role >= minRole;
  }
}
