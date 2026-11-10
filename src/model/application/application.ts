import * as Snowflake from "@/model/snowflake";
import { Schema } from "effect";
export const ApplicationId = Snowflake.fromString.pipe(Schema.brand("ApplicationId"));
