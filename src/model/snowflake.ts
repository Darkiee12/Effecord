import { Schema, SchemaTransformation, DateTime } from "effect";

// https://docs.discord.com/developers/reference#snowflakes
export const DISCORD_GENESIS_EPOCH = 1420070400000;

const MAX_SNOWFLAKE = (1n << 64n) - 1n;

export const Snowflake = Schema.BigInt.check(
  Schema.isBetweenBigInt({
    minimum: 1n,
    maximum: MAX_SNOWFLAKE,
  }),
).pipe(Schema.brand("Snowflake"));

type Snowflake = typeof Snowflake.Type;

export const fromString = Schema.String.pipe(
  Schema.decodeTo(Snowflake, SchemaTransformation.bigintFromString),
);

export const getTimestamp = (id: Snowflake): DateTime.Utc =>
  DateTime.makeUnsafe({
    epochMilliseconds: Number(id >> 22n) + DISCORD_GENESIS_EPOCH,
  });

export const getNativeDate = (id: Snowflake): Date => DateTime.toDateUtc(getTimestamp(id));
