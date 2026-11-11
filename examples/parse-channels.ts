
import { Schema } from "effect";
import { Channel } from "@/model/channel";

const token = Bun.env.DISCORD_TOKEN;
const guildId = Bun.env.TEST_GUILD;

if (!token || !guildId) {
  throw new Error("Missing DISCORD_TOKEN or TEST_GUILD_ID");
}

// Fetch real channels from your Discord server.
const response = await fetch(
  `https://discord.com/api/v10/guilds/${guildId}/channels`,
  {
    headers: {
      Authorization: `Bot ${token}`,
    },
  },
);

if (!response.ok) {
  throw new Error(
    `Discord API error ${response.status}: ${await response.text()}`,
  );
}

// Untrusted JSON → validated Effect models.
const channels = Schema.decodeUnknownSync(
  Schema.Array(Channel),
)(await response.json());

console.log(`\nSuccessfully parsed ${channels.length} channels\n`);

for (const channel of channels) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Type:", channel._tag);
  console.log("ID:", channel.id);
  console.log("Discord type:", channel.type);

  switch (channel._tag) {
    case "GuildText":
    case "GuildAnnouncement": {
      console.log("Name:", channel.name);
      console.log("Topic:", channel.topic);
      console.log("Last message:", channel.lastMessageId);

      if (channel.permissionOverwrites) {
        console.log("Permission overwrites:");

        for (const overwrite of channel.permissionOverwrites) {
          console.log("  Target:", overwrite.id);
          console.log("  Allow:", overwrite.allow.toArray());
          console.log("  Deny:", overwrite.deny.toArray());
        }
      }
      break;
    }

    case "GuildVoice":
    case "GuildStage": {
      console.log("Name:", channel.name);
      console.log("Bitrate:", channel.bitrate);
      console.log("User limit:", channel.userLimit);
      break;
    }

    case "GuildForum":
    case "GuildMedia": {
      console.log("Name:", channel.name);
      console.log("Available tags:", channel.availableTags);
      console.log("Default layout:", channel.defaultForumLayout);
      break;
    }

    case "GuildCategory": {
      console.log("Category:", channel.name);
      break;
    }

    case "Unknown": {
      console.log("Unknown Discord channel type");
      break;
    }

    default: {
      console.log("Recognized channel:", channel._tag);
    }
  }

  // Uses your actual BitSet class.
  if (channel.flags) {
    console.log("Flags:", channel.flags.toArray());
  }

  // Demonstrate encoding back to Discord's wire format.
  const encoded = Schema.encodeSync(Channel)(channel);

  console.log("Encoded type:", encoded.type);
}

console.log("\nAll channels parsed successfully!");
