import type { UserId } from "@/model/user/user";
import { Schema } from "effect";

import { RateLimit, Route } from "./types";

export const Routes = Route.defineAll({
  CurrentUser: Route.define({
    params: Schema.Struct({}),
    path: "/users/@me",
    rateLimit: RateLimit.path(),
  }),
});
