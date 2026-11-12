import { Schema } from "effect";

const NonNegativeNumber = Schema.FiniteFromString.check(
  Schema.isGreaterThanOrEqualTo(0),
);

const NonNegativeInteger = Schema.FiniteFromString.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
);

export const decodeNumber = Schema.decodeUnknownOption(NonNegativeNumber);
export const decodeInteger = Schema.decodeUnknownOption(NonNegativeInteger);