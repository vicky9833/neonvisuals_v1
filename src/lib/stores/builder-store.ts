import { create } from "zustand";
import type { BuilderItem } from "@/lib/engines/gift-builder";

/** Client state for the Gift Builder kit configurator. */
interface BuilderState {
  items: BuilderItem[];
  packagingTier: "budget" | "standard" | "premium" | "flagship";
  addItem: (item: BuilderItem) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setPackagingTier: (tier: BuilderState["packagingTier"]) => void;
  reset: () => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  items: [],
  packagingTier: "standard",
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          ),
        };
      }
      return { items: [...state.items, item] };
    }),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),
  setQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i,
      ),
    })),
  setPackagingTier: (packagingTier) => set({ packagingTier }),
  reset: () => set({ items: [], packagingTier: "standard" }),
}));
