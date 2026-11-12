import { Schema } from "effect";
import { Permission } from "@/model/permission/flags";
import { PermissionOverwrite } from "@/model/permission/overwrite";

const token = Bun.env.DISCORD_TOKEN;
const guildId = Bun.env.TEST_GUILD_ID;

if (!token || !guildId) {
  throw new Error("Missing Discord bot token or guild ID");
}

const ChannelProbe = Schema.Struct({
  id: Schema.String,
  type: Schema.Int,
  permissionOverwrites: Schema.optionalKey(Schema.Array(PermissionOverwrite)),
}).pipe(
  Schema.encodeKeys({
    permissionOverwrites: "permission_overwrites",
  }),
);

const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
  headers: {
    Authorization: `Bot ${token}`,
  },
});

if (!response.ok) {
  throw new Error(`Discord API returned ${response.status}`);
}

const channels = Schema.decodeUnknownSync(Schema.Array(ChannelProbe))(await response.json());

let count = 0;

for (const channel of channels) {
  for (const overwrite of channel.permissionOverwrites ?? []) {
    count++;

    console.log("Channel:", channel.id);
    console.log("Overwrite type:", overwrite.type);
    console.log("Allow is class:", overwrite.allow instanceof Permission);
    console.log("Allow:", overwrite.allow.toArray());
    console.log("Deny:", overwrite.deny.toArray());

    const encoded = Schema.encodeSync(PermissionOverwrite)(overwrite);

    console.log("Encoded:", encoded);
    console.log("---");
  }
}

console.log(`Validated ${count} permission overwrites`);
