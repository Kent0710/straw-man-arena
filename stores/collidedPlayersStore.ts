import { create } from "zustand";

interface CollidedPlayerType {
    id: string;
    isInfected: boolean;
}

export const useCollidedPlayersStore = create<{
    collidedPlayers: CollidedPlayerType[];
    addCollidedPlayer: (id: string, isInfected: boolean) => void;
    clearPlayers: () => void;
}>((set) => ({
    collidedPlayers: [],
    addCollidedPlayer: (id: string, isInfected: boolean) =>
        set((state) => {
            // Avoid duplicates
            if (state.collidedPlayers.find((p) => p.id === id)) {
                return state;
            }
            return {
                collidedPlayers: [...state.collidedPlayers, { id, isInfected }],
            };
        }),
    clearPlayers: () =>
        set(() => ({
            collidedPlayers: [],
        })),
}));
