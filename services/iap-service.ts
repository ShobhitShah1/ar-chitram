import { mmkvStorage } from "@/utils/storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface ProductInfo {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
  type: "in-app" | "subscription";
}

export interface PurchaseRecord {
  productId: string;
  purchaseToken: string;
  purchaseTime: number;
  transactionId: string;
  platform: "ios" | "android";
}

interface IAPStoreState {
  purchasedProductIds: string[];
  purchases: PurchaseRecord[];
  addPurchase: (purchase: PurchaseRecord) => void;
  isPurchased: (productId: string) => boolean;
  restorePurchases: (purchases: PurchaseRecord[]) => void;
  removePurchase: (productId: string) => void;
  clearPurchases: () => void;
}

export const getProductSKUs = (
  additionalSkus: Array<string | null | undefined> = [],
): string[] =>
  Array.from(
    new Set(
      additionalSkus.filter(
        (sku): sku is string =>
          typeof sku === "string" && sku.trim().length > 0,
      ),
    ),
  );

export const useIAPStore = create<IAPStoreState>()(
  persist(
    (set, get) => ({
      purchasedProductIds: [],
      purchases: [],
      addPurchase: (purchase) => {
        const state = get();

        if (state.purchasedProductIds.includes(purchase.productId)) {
          return;
        }

        set({
          purchasedProductIds: [
            ...state.purchasedProductIds,
            purchase.productId,
          ],
          purchases: [...state.purchases, purchase],
        });
      },
      isPurchased: (productId) => get().purchasedProductIds.includes(productId),
      restorePurchases: (purchases) => {
        const productIds = purchases.map((purchase) => purchase.productId);

        set({
          purchasedProductIds: Array.from(new Set(productIds)),
          purchases,
        });
      },
      removePurchase: (productId) => {
        const state = get();

        set({
          purchasedProductIds: state.purchasedProductIds.filter(
            (id) => id !== productId,
          ),
          purchases: state.purchases.filter(
            (purchase) => purchase.productId !== productId,
          ),
        });
      },
      clearPurchases: () => {
        set({
          purchasedProductIds: [],
          purchases: [],
        });
      },
    }),
    {
      name: "iap-storage",
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
