import { create } from "zustand";
import axios from "axios";
import type { DataState, Client } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const useDataStore = create<DataState>((set, get) => ({
  clients: [],
  trash: [],
  isLoading: false,
  error: null,

  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_BASE}/api/data`);
      if (response.data) {
        set({
          clients: response.data.clientsDB || [],
          trash: response.data.trashDB || [],
          isLoading: false,
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Failed to load data";
      set({ error: errorMessage, isLoading: false });
    }
  },

  saveData: async () => {
    const { clients, trash } = get();
    try {
      await axios.post(`${API_BASE}/api/data`, {
        clientsDB: clients,
        trashDB: trash,
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Failed to save data";
      set({ error: errorMessage });
    }
  },

  addClient: async (clientData) => {
    const newClient: Client = {
      id: Date.now().toString(),
      ...clientData,
    };

    set((state) => ({
      clients: [...state.clients, newClient],
    }));

    // Save to backend
    await get().saveData();
  },

  updateClient: async (id: string, updates: Partial<Client>) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    }));

    await get().saveData();
  },

  deleteClient: async (id: string) => {
    set((state) => {
      const clientToMove = state.clients.find((c) => c.id === id);
      return {
        clients: state.clients.filter((c) => c.id !== id),
        trash: clientToMove ? [...state.trash, clientToMove] : state.trash,
      };
    });

    await get().saveData();
  },

  restoreClient: async (id: string) => {
    set((state) => {
      const clientToRestore = state.trash.find((c) => c.id === id);
      return {
        trash: state.trash.filter((c) => c.id !== id),
        clients: clientToRestore
          ? [...state.clients, clientToRestore]
          : state.clients,
      };
    });

    await get().saveData();
  },

  permanentDeleteClient: async (id: string) => {
    set((state) => ({
      trash: state.trash.filter((c) => c.id !== id),
    }));

    try {
      await axios.post(`${API_BASE}/api/permanent-delete-client`, {
        clientId: id,
      });
      await get().saveData();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Failed to delete";
      set({ error: errorMessage });
    }
  },
}));
