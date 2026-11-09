---
title: Channel type safety
date: 2026-11-09
status: completed
---

## Context

The channel model needed precise relationships between channel names and numeric wire types using native Effect schemas.

## What happened

Made `Schema.Enum` the single source of truth. The `known` helper accepts one literal name and derives both discriminators; union names are rejected. A mapped schema registry checks completeness and exact discriminator pairs, while `Record.values` preserves the schema union. Unknown channel types now require an integer exclusion check and carry a brand.

## Reflection

Effect collections alone do not preserve key/value correlations. Deriving discriminator fields and checking the registry statically provides stronger guarantees. Runtime validation remains necessary at the wire boundary.

## Decisions

Kept nested `Schema.Unknown` fields unchanged. No public documentation change was needed. The tester reported 18 passing tests. Full formatting remains blocked by four pre-existing guild/message files; changed channel files pass formatting.

## Next

Model nested payloads separately when their schemas are defined.
