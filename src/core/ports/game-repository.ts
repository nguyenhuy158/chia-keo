import type { Game } from "../domain/types";

export type RemoteGameRepository = {
  fetchGames: () => Promise<Game[]>;
  createGame: (game: Game) => Promise<Game>;
  saveGame: (game: Game) => Promise<Game>;
};
