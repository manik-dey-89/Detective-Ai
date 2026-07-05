import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Player, GameState, Case } from '../types';
import { playerApi } from './api';

interface GameStore {
  player: Player | null;
  currentGame: GameState | null;
  currentCase: Case | null;
  cases: Case[];
  caseGameMap: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  lastPlayerFetch: number;
  lastCasesFetch: number;

  setPlayer: (player: Player | null) => void;
  setCurrentGame: (game: GameState | null) => void;
  setCurrentCase: (caseData: Case | null) => void;
  setCases: (cases: Case[]) => void;
  setCaseGameMap: (map: Record<string, string>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  refreshPlayer: (playerId: string, force?: boolean) => Promise<Player | null>;
  refreshDashboard: (playerId: string, force?: boolean) => Promise<void>;
}

const CACHE_TTL_MS = 30_000;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      player: null,
      currentGame: null,
      currentCase: null,
      cases: [],
      caseGameMap: {},
      isLoading: false,
      error: null,
      lastPlayerFetch: 0,
      lastCasesFetch: 0,

      setPlayer: (player) => set({ player }),
      setCurrentGame: (game) => set({ currentGame: game }),
      setCurrentCase: (caseData) => set({ currentCase: caseData }),
      setCases: (cases) => set({ cases, lastCasesFetch: Date.now() }),
      setCaseGameMap: (map) => set({ caseGameMap: map }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      refreshPlayer: async (playerId, force = false) => {
        const { lastPlayerFetch } = get();
        if (!force && Date.now() - lastPlayerFetch < CACHE_TTL_MS && get().player?.id === playerId) {
          return get().player;
        }
        try {
          const response = await playerApi.get(playerId);
          const player = response.data.data;
          set({ player, lastPlayerFetch: Date.now() });
          return player;
        } catch {
          return get().player;
        }
      },

      refreshDashboard: async (playerId, force = false) => {
        const { refreshPlayer } = get();
        await refreshPlayer(playerId, force);
      },
    }),
    {
      name: 'detective-ai-storage',
      partialize: (state) => ({
        player: state.player,
        currentGame: state.currentGame,
        currentCase: state.currentCase,
      }),
    }
  )
);

export const usePlayer = () => useGameStore((s) => s.player);
export const useCurrentGame = () => useGameStore((s) => s.currentGame);
export const useCurrentCase = () => useGameStore((s) => s.currentCase);
export const useIsLoading = () => useGameStore((s) => s.isLoading);
