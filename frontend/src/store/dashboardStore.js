import { create } from 'zustand';
import { endpoints } from '../api/client';

export const useDashboardStore = create((set, get) => ({
  kpis: null,
  availability: null,
  deliveries: null,
  conflicts: null,
  campusStats: null,
  health: null,
  lastSynced: null,
  isLoading: true,
  error: null,
  selectedRange: '1M',
  setSelectedRange: (range) => set({ selectedRange: range }),
  pollingInterval: null,

  fetchAll: async () => {
    try {
      const [kpis, availability, deliveries, conflicts, campusStats, health] = await Promise.all([
        endpoints.kpis(),
        endpoints.availability(),
        endpoints.deliveries({ limit: 200 }),
        endpoints.conflicts(),
        endpoints.campusStats(),
        endpoints.health(),
      ]);
      set({
        kpis,
        availability,
        deliveries,
        conflicts,
        campusStats,
        health,
        lastSynced: new Date(),
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  startPolling: () => {
    get().fetchAll();
    if (!get().pollingInterval) {
      const interval = setInterval(() => get().fetchAll(), 5 * 60 * 1000);
      set({ pollingInterval: interval });
    }
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) clearInterval(pollingInterval);
    set({ pollingInterval: null });
  },
}));
