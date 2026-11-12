import { HashMap, Schema, SchemaGetter, SchemaTransformation } from "effect";

export const make = <Name extends string>(
  identifier: string,
  definitions: HashMap.HashMap<Name, number | bigint>,
) => {
  const mask = (flag: Name): bigint => BigInt(HashMap.getUnsafe(definitions, flag));

  class BitSet extends Schema.Class<BitSet, { readonly brand: unique symbol }>(identifier)({
    bits: Schema.BigInt.check(
      Schema.makeFilter((bits) => bits >= 0n || "Bitfield must be non-negative"),
    ),
  }) {
    has(flag: Name): boolean {
      const bit = mask(flag);
      return (this.bits & bit) === bit;
    }

    any(flags: ReadonlyArray<Name>): boolean {
      return flags.some((flag) => this.has(flag));
    }

    all(flags: ReadonlyArray<Name>): boolean {
      return flags.every((flag) => this.has(flag));
    }

    missing(flags: ReadonlyArray<Name>): Array<Name> {
      return flags.filter((flag) => !this.has(flag));
    }

    toArray(): Array<Name> {
      return HashMap.toEntries(definitions)
        .filter(([flag]) => this.has(flag))
        .map(([flag]) => flag);
    }

    add(flag: Name): BitSet {
      return new BitSet({
        bits: this.bits | mask(flag),
      });
    }

    remove(flag: Name): BitSet {
      return new BitSet({
        bits: this.bits & ~mask(flag),
      });
    }

    union(other: BitSet): BitSet {
      return new BitSet({
        bits: this.bits | other.bits,
      });
    }

    intersect(other: BitSet): BitSet {
      return new BitSet({
        bits: this.bits & other.bits,
      });
    }

    override toString(): string {
      return this.bits.toString();
    }
  }

  // Discord permission fields are decimal strings.
  const decimal = Schema.String.check(Schema.isPattern(/^(0|[1-9]\d*)$/)).pipe(
    Schema.decodeTo(Schema.BigInt, SchemaTransformation.bigintFromString),
  );

  const fromString = decimal.pipe(
    Schema.decodeTo(BitSet, {
      decode: SchemaGetter.transform((bits) => ({ bits })),
      encode: SchemaGetter.transform(({ bits }) => bits),
    }),
  );

  // User and channel flags are JSON numbers.
  const fromNumber = Schema.Int.check(
    Schema.isBetween({
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
    }),
  ).pipe(
    Schema.decodeTo(BitSet, {
      decode: SchemaGetter.transform((value) => ({ bits: BigInt(value) })),
      encode: SchemaGetter.transform(({ bits }) => Number(bits)),
    }),
  );

  return {
    BitSet,
    fromString,
    fromNumber,
  };
};
