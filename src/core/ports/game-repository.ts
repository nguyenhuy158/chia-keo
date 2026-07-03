import type { Game } from "../domain/types";

export type GameRepository = {
  loadGames: () => Game[];
  saveGames: (games: Game[]) => void;
};

export type RemoteGameRepository = {
  fetchGames: (token: string) => Promise<Game[]>;
  createGame: (token: string, game: Game) => Promise<Game>;
  saveGame: (token: string, game: Game) => Promise<Game>;
};
