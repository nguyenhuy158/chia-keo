import { Hono } from "hono";
import { photoInputSchema, photoUpdateSchema } from "../../../shared/schemas";
import {
  addGamePhoto,
  getPhotoForOwner,
  listGamePhotos,
  removePhoto,
  updatePhoto,
} from "../core/application/photos";
import { invalidInput, readJson, respond } from "../lib/http";
import { protectPaths, type AuthedEnv } from "../lib/require-user";

// Driving adapter: chi parse HTTP, goi use case va map ket qua/loi ve JSON.
export const photosRouter = new Hono<AuthedEnv>();

protectPaths(photosRouter, "/games/:gameId/photos", "/photos/*");

photosRouter.get("/games/:gameId/photos", (c) =>
  respond(c, () => listGamePhotos(c.get("repo"), c.get("userId"), c.req.param("gameId"))),
);

photosRouter.post("/games/:gameId/photos", async (c) => {
  const input = await readJson(c, photoInputSchema);
  if (!input) return invalidInput(c);

  return respond(
    c,
    () => addGamePhoto(c.get("repo"), c.get("userId"), c.req.param("gameId"), input),
    201,
  );
});

photosRouter.get("/photos/:photoId", (c) =>
  respond(c, () => getPhotoForOwner(c.get("repo"), c.get("userId"), c.req.param("photoId"))),
);

photosRouter.patch("/photos/:photoId", async (c) => {
  const input = await readJson(c, photoUpdateSchema);
  if (!input) return invalidInput(c);

  return respond(c, () =>
    updatePhoto(c.get("repo"), c.get("userId"), c.req.param("photoId"), input),
  );
});

photosRouter.delete("/photos/:photoId", (c) =>
  respond(c, () => removePhoto(c.get("repo"), c.get("userId"), c.req.param("photoId"))),
);
