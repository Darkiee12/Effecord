import { describe, expect, expectTypeOf, test } from "bun:test";
import { DateTime, Schema } from "effect";
import {
  Application,
  ApplicationEventWebhookStatus,
  ApplicationFlags,
  ApplicationFlagsNew,
  ApplicationId,
  InstallParams,
  Team,
  TeamMembershipState,
} from "@/model/application";
import { Webhook, WebhookId, WebhookType } from "@/model/webhook";
import {
  ExtendedInvite,
  GuildInviteFlags,
  Invite,
  InviteMetadata,
  InviteTargetType,
  InviteType,
} from "@/model/invite";

describe("application resource", () => {
  const wire: typeof Application.Encoded = {
    id: "172150183260323840",
    name: "Baba O'Riley",
    icon: null,
    description: "Test",
    bot_public: true,
    bot_require_code_grant: false,
    owner: {
      id: "172150183260323840",
      username: "i own a bot",
      discriminator: "1738",
      avatar: null,
    },
    verify_key: "1e0a356058d627ca38a5c8c9648818061d49e49bd9da9e3ab17d98ad4d6bg2u8",
    team: {
      icon: "dd9b7dcfdf5351b9c3de0fe167bacbe1",
      id: "531992624043786253",
      members: [
        {
          membership_state: 2,
          permissions: ["*"],
          team_id: "531992624043786253",
          user: {
            id: "511972282709709995",
            username: "Mr Owner",
            discriminator: "0001",
            avatar: "d9e261cd35999608eb7e3de1fae3688b",
          },
        },
      ],
      name: "A team",
      owner_user_id: "511972282709709995",
    },
    flags: 8192,
    flags_new: "8192",
    integration_types_config: {
      "0": {
        oauth2_install_params: {
          scopes: ["applications.commands", "bot"],
          permissions: "2048",
        },
      },
    },
    custom_install_url: "https://example.com/install",
  };

  test("decodes official-like payload and roundtrips wire keys", () => {
    const app = Schema.decodeSync(Application)(wire);
    expect(app.id.toString()).toBe("172150183260323840");
    expect(app.team?.members[0]?.user.username).toBe("Mr Owner");
    expect(app.team?.members[0]?.membershipState).toBe(TeamMembershipState.enums.Accepted);
    expect(app.flags?.has("GatewayPresenceLimited")).toBe(true);
    expect(app.flagsNew?.has("GatewayPresenceLimited")).toBe(true);
    expect(Schema.encodeSync(Application)(app)).toEqual(wire);
    expectTypeOf<Application["id"]>().toEqualTypeOf<ApplicationId>();
    expectTypeOf<NonNullable<Application["team"]>>().toEqualTypeOf<Team>();
  });

  test("requires core fields and rejects invalid flags", () => {
    expect(() => Schema.decodeUnknownSync(Application)({ ...wire, id: undefined })).toThrow();
    expect(() => Schema.decodeUnknownSync(Application)({ ...wire, verify_key: 42 })).toThrow();
    expect(() => Schema.decodeUnknownSync(Application)({ ...wire, flags: "8192" })).toThrow();
    expect(() => Schema.decodeUnknownSync(Application)({ ...wire, flags_new: 8192 })).toThrow();
    expect(ApplicationEventWebhookStatus.enums.Enabled).toBe(2);
    expect(ApplicationEventWebhookStatus.enums.DisabledByDiscord).toBe(3);
  });

  test("install params keep scopes and permission bit string", () => {
    const params = Schema.decodeSync(InstallParams)({
      scopes: ["applications.commands", "bot"],
      permissions: "2048",
    });
    expect(params.permissions).toBe("2048");
    expect(() =>
      Schema.decodeUnknownSync(InstallParams)({ scopes: [], permissions: 2048 }),
    ).toThrow();
  });
});

describe("webhook resource", () => {
  test("roundtrips an incoming webhook with token", () => {
    const wire: typeof Webhook.Encoded = {
      id: "223704706495545344",
      type: 1,
      guild_id: "199737254929760256",
      channel_id: "199737254929760256",
      user: {
        id: "190320984123768832",
        username: "test",
        discriminator: "7479",
        avatar: "b004ec1740a63ca06ae2e14c5cee11f3",
      },
      name: "test webhook",
      avatar: null,
      token: "test-webhook-token",
      application_id: null,
    };
    const webhook = Schema.decodeSync(Webhook)(wire);
    expect(webhook.type).toBe(WebhookType.enums.Incoming);
    expect(Schema.encodeSync(Webhook)(webhook)).toEqual(wire);
    expectTypeOf<Webhook["id"]>().toEqualTypeOf<WebhookId>();
  });

  test("roundtrips a channel follower webhook with source partials", () => {
    const wire: typeof Webhook.Encoded = {
      id: "752831914402115456",
      type: 2,
      guild_id: "56188498421443265",
      channel_id: "561885260615255432",
      name: "Guildy name",
      avatar: "bb71f469c158984e265093a81b3397fb",
      application_id: null,
      source_guild: { id: "56188498421476534", name: "Guildy name" },
      source_channel: { id: "5618852344134324", name: "announcements" },
    };
    expect(Schema.encodeSync(Webhook)(Schema.decodeSync(Webhook)(wire))).toEqual(wire);
  });

  test("rejects unknown webhook types", () => {
    const wire = {
      id: "1",
      type: 4,
      channel_id: null,
      name: null,
      avatar: null,
      application_id: null,
    };
    expect(() => Schema.decodeUnknownSync(Webhook)(wire)).toThrow();
    expect(WebhookType.enums.Application).toBe(3);
  });
});

describe("invite resource", () => {
  const wire: typeof Invite.Encoded = {
    type: 0,
    code: "0vCdhLbwjZZTWZLD",
    guild: { id: "165176875973476352", name: "CS:GO Fraggers Only" },
    channel: { id: "165176875973476352", name: "illuminati", type: 0 },
    inviter: { id: "115590097100865541", username: "speed", discriminator: "7653" },
    target_type: 1,
    target_user: { id: "165176875973476352", username: "bob" },
    approximate_presence_count: 10,
    approximate_member_count: 100,
  };

  test("decodes guild invite and keeps code as plain string", () => {
    const invite = Schema.decodeSync(Invite)(wire);
    expect(invite.type).toBe(InviteType.enums.Guild);
    expect(invite.targetType).toBe(InviteTargetType.enums.Stream);
    expect(Schema.encodeSync(Invite)(invite)).toEqual(wire);
    // Invite codes are opaque strings, not snowflakes.
    expectTypeOf<Invite["code"]>().toEqualTypeOf<string>();
    expectTypeOf<Invite["code"]>().not.toEqualTypeOf<bigint>();
  });

  test("extends with metadata and rejects invalid enums", () => {
    const extended: typeof ExtendedInvite.Encoded = {
      ...wire,
      uses: 1,
      max_uses: 0,
      max_age: 86400,
      temporary: false,
      created_at: "2024-01-02T03:04:05.000Z",
    };
    const decoded = Schema.decodeSync(ExtendedInvite)(extended);
    expect(decoded.uses).toBe(1);
    expect(Schema.encodeSync(ExtendedInvite)(decoded)).toEqual(extended);
    expectTypeOf<ExtendedInvite["createdAt"]>().toEqualTypeOf<DateTime.Utc>();
    expect(() => Schema.decodeUnknownSync(Invite)({ ...wire, type: 3 })).toThrow();
    expect(() => Schema.decodeUnknownSync(Invite)({ ...wire, target_type: 3 })).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(InviteMetadata)({ ...extended, temporary: "false" }),
    ).toThrow();
  });

  test("guild invite flags mark guest invites", () => {
    const flags = Schema.decodeSync(GuildInviteFlags)(1);
    expect(flags.has("IsGuestInvite")).toBe(true);
    expect(() => Schema.decodeUnknownSync(GuildInviteFlags)("1")).toThrow();
  });
});
