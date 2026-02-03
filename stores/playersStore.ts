import { create } from "zustand";
import { PlayerType } from "@/lib/types";

type PlayersStore = {
    players: PlayerType[];
    setPlayers: (players: PlayerType[]) => void;
    addPlayer: (player: PlayerType) => void;
    updatePlayer: (player: PlayerType) => void;
    removePlayer: (playerId: string) => void;
};

export const usePlayersStore = create<PlayersStore>((set) => ({
    players: [],

    setPlayers: (players) => set({ players }),

    addPlayer: (player) =>
        set((state) => ({
            players: [...state.players, player],
        })),

    updatePlayer: (player) =>
        set((state) => ({
            players: state.players.map((p) =>
                p.id === player.id ? player : p,
            ),
        })),

    removePlayer: (playerId) =>
        set((state) => ({
            players: state.players.filter((p) => p.id !== playerId),
        })),
}));
