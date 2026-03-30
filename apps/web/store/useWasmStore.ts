import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WasmEntry {
  hash: string;
  name: string;
  network: string;
  installedAt: number;
  functions?: string[];
  /** Contract ID associated after a successful deploy */
  deployedContractId?: string;
  deployedAt?: number;
  /** Workspace context at upload time */
  workspaceId?: string;
  /** Whether the last parse attempt failed */
  parseError?: boolean;
}

interface WasmState {
  wasms: WasmEntry[];
  addWasm: (entry: WasmEntry) => void;
  removeWasm: (hash: string) => void;
  associateContract: (hash: string, contractId: string) => void;
}

export const useWasmStore = create<WasmState>()(
  persist(
    (set) => ({
      wasms: [],

      addWasm: (entry) =>
        set((state) => {
          // Gracefully handle duplicate uploads — update metadata instead of duplicating
          const existing = state.wasms.find((w) => w.hash === entry.hash);
          if (existing) {
            return {
              wasms: state.wasms.map((w) =>
                w.hash === entry.hash
                  ? { ...w, name: entry.name, network: entry.network, functions: entry.functions ?? w.functions }
                  : w,
              ),
            };
          }
          return { wasms: [entry, ...state.wasms] };
        }),

      removeWasm: (hash) =>
        set((state) => ({
          wasms: state.wasms.filter((w) => w.hash !== hash),
        })),

      associateContract: (hash, contractId) =>
        set((state) => ({
          wasms: state.wasms.map((w) =>
            w.hash === hash
              ? { ...w, deployedContractId: contractId, deployedAt: Date.now() }
              : w,
          ),
        })),
    }),
    { name: "soroban-wasm-storage" },
  ),
);
