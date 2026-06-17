import { create } from "zustand";
import type { BucketCode } from "@/lib/types/product";

/** Catalogue filter state (bucket, occasion, budget, search). */
interface FilterState {
  search: string;
  bucket: BucketCode | null;
  occasion: string | null;
  maxBudget: number | null;
  setSearch: (search: string) => void;
  setBucket: (bucket: BucketCode | null) => void;
  setOccasion: (occasion: string | null) => void;
  setMaxBudget: (maxBudget: number | null) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  search: "",
  bucket: null,
  occasion: null,
  maxBudget: null,
  setSearch: (search) => set({ search }),
  setBucket: (bucket) => set({ bucket }),
  setOccasion: (occasion) => set({ occasion }),
  setMaxBudget: (maxBudget) => set({ maxBudget }),
  reset: () =>
    set({ search: "", bucket: null, occasion: null, maxBudget: null }),
}));
