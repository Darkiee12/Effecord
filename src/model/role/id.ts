import { Schema } from "effect";

import * as Snowflake from "@/model/snowflake";

export const RoleId = Snowflake.fromString.pipe(Schema.brand("RoleId"));
export type RoleId = typeof RoleId.Type;
