const fields = foundry.data.fields;

export const CLICK_EVENT_NAME = "regionClickLeft";

export class ClickMacroBehaviorType extends foundry.data.regionBehaviors.RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["REGION_CLICK_MACRO.BEHAVIOR.ClickMacro"];

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
    const ROLES = CONST.USER_ROLES;
    switch (this.triggerPermission) {
      case "ALL": return true;
      case "PLAYER": return user.role >= ROLES.PLAYER;
      case "TRUSTED": return user.role >= ROLES.TRUSTED;
      case "ASSISTANT": return user.role >= ROLES.ASSISTANT;
      case "GAMEMASTER": return user.role >= ROLES.GAMEMASTER;
      default: return false;
    }
  }

  async _handleRegionEvent(event) {
    if (event?.name !== CLICK_EVENT_NAME) return;
    if (!this.uuid) return;

    const user = event.data?.user ?? game.user;
    if (!this.userCanTrigger(user)) return;

    const macro = await fromUuid(this.uuid);
    if (!macro) {
      console.warn(`region-click-macro | Macro ${this.uuid} not found for behavior ${this.parent?.uuid}`);
      return;
    }

    await macro.execute({
      event,
      region: this.parent?.region,
      behavior: this.parent
    });
  }
}
