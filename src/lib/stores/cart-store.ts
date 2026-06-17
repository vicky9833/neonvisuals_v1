import { create } from "zustand";

/**
 * Quote-draft store. Neon Visuals sells via quotes (not checkout carts);
 * this holds the items a buyer is assembling before requesting a quote.
 */
export interface QuoteDraftItem {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

interface CartState {
  items: QuoteDraftItem[];
  addItem: (item: QuoteDraftItem) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
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
  clear: () => set({ items: [] }),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
