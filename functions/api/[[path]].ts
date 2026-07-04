import app from "../../worker/src/index";
import type { Env } from "../../worker/src/env";

export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, context.env, context as unknown as ExecutionContext);
