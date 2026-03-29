import { useUser } from "@/context/user-context";
import { addSkuToProfile } from "@/services/api-service";
import {
  getProductSKUs,
  ProductInfo,
  PurchaseRecord,
  useIAPStore,
} from "@/services/iap-service";
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  requestPurchase,
  restorePurchases as restorePurchasesIAP,
  type Purchase,
} from "expo-iap";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Platform } from "react-native";

interface IAPContextType {
  isConnected: boolean;
  isInitializing: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  error: string | null;
  products: ProductInfo[];
  getProduct: (sku: string) => ProductInfo | undefined;
  isPurchased: (sku?: string | null) => boolean;
  purchaseProduct: (sku?: string | null) => Promise<boolean>;
  ensureProductLoaded: (sku?: string | null) => Promise<void>;
  ensureProductsLoaded: (
    skus: Array<string | null | undefined>,
  ) => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const IAPContext = createContext<IAPContextType | null>(null);

interface IAPProviderProps {
  children: ReactNode;
}

const RESTORE_PURCHASE_OPTIONS = {
  alsoPublishToEventListenerIOS: false,
  onlyIncludeActiveItemsIOS: true,
} as const;

const toProductInfo = (product: {
  id: string;
  title?: string | null;
  description?: string | null;
  displayPrice?: string | null;
  price?: string | number | null;
  currency?: string | null;
}): ProductInfo => ({
  id: product.id,
  title: product.title || "",
  description: product.description || "",
  price: product.displayPrice || "",
  priceAmount: parseFloat(String(product.price ?? "0")),
  currency: product.currency || "USD",
  type: "in-app",
});

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message || fallback : fallback;

const areProductsEqual = (
  currentProducts: ProductInfo[],
  nextProducts: ProductInfo[],
) =>
  currentProducts.length === nextProducts.length &&
  currentProducts.every((product, index) => {
    const nextProduct = nextProducts[index];
    return (
      product?.id === nextProduct?.id &&
      product?.title === nextProduct?.title &&
      product?.description === nextProduct?.description &&
      product?.price === nextProduct?.price &&
      product?.priceAmount === nextProduct?.priceAmount &&
      product?.currency === nextProduct?.currency &&
      product?.type === nextProduct?.type
    );
  });

export function IAPProvider({ children }: IAPProviderProps) {
  const { purchasedSkus, syncProfile } = useUser();
  const iapStore = useIAPStore();

  const [isConnected, setIsConnected] = useState(false);
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processedTransactions = useRef<Set<string>>(new Set());
  const processedRestoredPurchases = useRef<Set<string>>(new Set());
  const loadedProductSkusRef = useRef<Set<string>>(new Set());
  const initializationPromiseRef = useRef<Promise<boolean> | null>(null);
  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);
  const productsRef = useRef<ProductInfo[]>([]);

  const knownPurchasedSkus = useMemo(
    () =>
      Array.from(new Set([...purchasedSkus, ...iapStore.purchasedProductIds])),
    [iapStore.purchasedProductIds, purchasedSkus],
  );

  const isSkuPurchased = useCallback(
    (sku?: string | null) => {
      if (!sku) {
        return false;
      }

      return purchasedSkus.includes(sku) || iapStore.isPurchased(sku);
    },
    [iapStore, purchasedSkus],
  );

  const isProfileSkuUnlocked = useCallback(
    (sku?: string | null) => {
      if (!sku) {
        return false;
      }

      return purchasedSkus.includes(sku);
    },
    [purchasedSkus],
  );

  const mergeProducts = useCallback((nextProducts: ProductInfo[]) => {
    if (!nextProducts.length || !isMountedRef.current) {
      return;
    }

    setProducts((currentProducts) => {
      const productsById = new Map(
        currentProducts.map((product) => [product.id, product]),
      );

      for (const product of nextProducts) {
        productsById.set(product.id, product);
      }

      const mergedProducts = Array.from(productsById.values());

      if (areProductsEqual(currentProducts, mergedProducts)) {
        productsRef.current = currentProducts;
        return currentProducts;
      }

      productsRef.current = mergedProducts;
      return mergedProducts;
    });
  }, []);

  const hasProduct = useCallback(
    (sku: string) => productsRef.current.some((product) => product.id === sku),
    [],
  );

  const loadProducts = useCallback(
    async (
      additionalSkus: Array<string | null | undefined> = [],
      options?: { force?: boolean },
    ) => {
      const requestedSkus = getProductSKUs(additionalSkus);

      if (!requestedSkus.length) {
        return productsRef.current;
      }

      const shouldFetch =
        options?.force ||
        requestedSkus.some((sku) => !loadedProductSkusRef.current.has(sku));

      if (!shouldFetch) {
        return productsRef.current;
      }

      const storeProducts = await fetchProducts({
        skus: requestedSkus,
        type: "in-app",
      });

      requestedSkus.forEach((sku) => loadedProductSkusRef.current.add(sku));

      const normalizedProducts = (storeProducts || []).map(toProductInfo);
      mergeProducts(normalizedProducts);
      return normalizedProducts;
    },
    [mergeProducts],
  );

  const syncPurchasedSku = useCallback(
    async (sku: string) => {
      try {
        const response = await addSkuToProfile(sku);

        if (response.code !== 200) {
          console.error(
            "[IAP] Failed to sync SKU to profile:",
            response.message,
          );
          return false;
        }

        await syncProfile();
        return true;
      } catch (syncError) {
        console.error("[IAP] Failed to sync SKU to profile:", syncError);
        return false;
      }
    },
    [syncProfile],
  );

  const recordPurchase = useCallback(
    (purchase: Purchase) => {
      if (iapStore.isPurchased(purchase.productId)) {
        return false;
      }

      const purchaseRecord: PurchaseRecord = {
        productId: purchase.productId,
        purchaseToken: purchase.purchaseToken || "",
        purchaseTime: purchase.transactionDate || Date.now(),
        transactionId: purchase.transactionId || "",
        platform: Platform.OS as "ios" | "android",
      };

      iapStore.addPurchase(purchaseRecord);
      return true;
    },
    [iapStore],
  );

  const processPurchase = useCallback(
    async (purchase: Purchase) => {
      const txId = purchase.transactionId || purchase.productId;

      if (processedTransactions.current.has(txId)) {
        return isSkuPurchased(purchase.productId);
      }

      processedTransactions.current.add(txId);

      try {
        const shouldGrant =
          !purchase.purchaseState || purchase.purchaseState === "purchased";

        if (!shouldGrant) {
          return false;
        }

        const didRecordPurchase = recordPurchase(purchase);

        if (didRecordPurchase || !isProfileSkuUnlocked(purchase.productId)) {
          await syncPurchasedSku(purchase.productId);
        }

        await finishTransaction({ purchase, isConsumable: false });
        setError(null);
        return true;
      } catch (purchaseError) {
        console.error("[IAP] Error processing purchase:", purchaseError);

        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch {}

        return false;
      } finally {
        setTimeout(() => processedTransactions.current.delete(txId), 3000);
      }
    },
    [isProfileSkuUnlocked, isSkuPurchased, recordPurchase, syncPurchasedSku],
  );

  const hydrateRestoredPurchases = useCallback(
    async (shouldRestoreStore = false) => {
      if (shouldRestoreStore) {
        await restorePurchasesIAP();
      }

      const availablePurchases = await getAvailablePurchases(
        RESTORE_PURCHASE_OPTIONS,
      );
      const skusToSync = new Set<string>();

      for (const purchase of availablePurchases) {
        const restoreId = purchase.transactionId || purchase.productId;

        if (processedRestoredPurchases.current.has(restoreId)) {
          continue;
        }

        processedRestoredPurchases.current.add(restoreId);

        recordPurchase(purchase);

        if (!isProfileSkuUnlocked(purchase.productId)) {
          skusToSync.add(purchase.productId);
        }
      }

      if (skusToSync.size > 0) {
        await Promise.allSettled(
          Array.from(skusToSync).map((sku) => syncPurchasedSku(sku)),
        );
      }

      return availablePurchases;
    },
    [isProfileSkuUnlocked, recordPurchase, syncPurchasedSku],
  );

  const initializeIap = useCallback(
    async (options?: { restoreStore?: boolean }) => {
      if (initializationPromiseRef.current) {
        return initializationPromiseRef.current;
      }

      initializationPromiseRef.current = (async () => {
        setIsInitializing(true);

        try {
          const connected = await initConnection();

          if (!isMountedRef.current) {
            return connected;
          }

          setIsConnected(connected);

          if (!connected) {
            setError("IAP connection failed");
            return false;
          }

          await loadProducts(knownPurchasedSkus, { force: true });

          await hydrateRestoredPurchases(options?.restoreStore ?? true);
          return true;
        } catch (initError) {
          if (isMountedRef.current) {
            setError(getErrorMessage(initError, "IAP init failed"));
          }
          return false;
        } finally {
          if (isMountedRef.current) {
            setIsInitializing(false);
          }
          initializationPromiseRef.current = null;
        }
      })();

      return initializationPromiseRef.current;
    },
    [hydrateRestoredPurchases, knownPurchasedSkus, loadProducts],
  );

  useEffect(() => {
    isMountedRef.current = true;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      void initializeIap({
        restoreStore: knownPurchasedSkus.length === 0,
      });
    }

    return () => {
      isMountedRef.current = false;
      void endConnection().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    void loadProducts(knownPurchasedSkus);
  }, [isConnected, knownPurchasedSkus, loadProducts]);

  const purchaseProduct = useCallback(
    async (sku?: string | null): Promise<boolean> => {
      if (!sku) {
        return false;
      }

      if (isSkuPurchased(sku)) {
        return true;
      }

      if (isPurchasing) {
        return false;
      }

      setIsPurchasing(true);
      setError(null);

      try {
        const ready =
          isConnected || (await initializeIap({ restoreStore: false }));

        if (!ready) {
          return false;
        }

        const availableProducts = await loadProducts(
          [sku, ...knownPurchasedSkus],
          {
            force: !hasProduct(sku),
          },
        );

        if (!availableProducts.some((product) => product.id === sku)) {
          setError("Product unavailable");
          return false;
        }

        const purchaseResult = await requestPurchase({
          request: {
            apple: { sku },
            google: { skus: [sku] },
          },
          type: "in-app",
        });

        const purchases = Array.isArray(purchaseResult)
          ? purchaseResult
          : purchaseResult
            ? [purchaseResult]
            : [];

        if (!purchases.length) {
          return false;
        }

        let didUnlock = false;

        for (const purchase of purchases) {
          if (await processPurchase(purchase)) {
            didUnlock = true;
          }
        }

        return didUnlock;
      } catch (purchaseError) {
        const nextError = getErrorMessage(purchaseError, "Purchase failed");
        setError(nextError);

        if (
          nextError.toLowerCase().includes("already owned") ||
          nextError === "already-owned"
        ) {
          await hydrateRestoredPurchases(true);
          return isSkuPurchased(sku);
        }

        return false;
      } finally {
        setIsPurchasing(false);
      }
    },
    [
      hydrateRestoredPurchases,
      initializeIap,
      isConnected,
      isPurchasing,
      isSkuPurchased,
      hasProduct,
      knownPurchasedSkus,
      loadProducts,
      processPurchase,
    ],
  );

  const restorePurchases = useCallback(async () => {
    if (isRestoring) {
      return;
    }

    setIsRestoring(true);
    setError(null);

    try {
      const ready =
        isConnected || (await initializeIap({ restoreStore: false }));

      if (!ready) {
        Alert.alert("Error", "Could not restore purchases.");
        return;
      }

      const availablePurchases = await hydrateRestoredPurchases(true);

      if (availablePurchases.length > 0) {
        Alert.alert(
          "Restored",
          `Restored ${availablePurchases.length} purchase${
            availablePurchases.length === 1 ? "" : "s"
          }.`,
        );
      } else {
        Alert.alert("No Purchases", "No previous purchases found.");
      }
    } catch (restoreError) {
      setError(getErrorMessage(restoreError, "Restore failed"));
      Alert.alert("Error", "Could not restore purchases.");
    } finally {
      setIsRestoring(false);
    }
  }, [hydrateRestoredPurchases, initializeIap, isConnected, isRestoring]);

  const getProduct = useCallback(
    (sku: string) => products.find((product) => product.id === sku),
    [products],
  );

  const ensureProductLoaded = useCallback(
    async (sku?: string | null) => {
      if (!sku) {
        return;
      }

      const ready =
        isConnected || (await initializeIap({ restoreStore: false }));

      if (!ready) {
        return;
      }

      await loadProducts([sku], {
        force: !hasProduct(sku),
      });
    },
    [hasProduct, initializeIap, isConnected, loadProducts],
  );

  const ensureProductsLoaded = useCallback(
    async (skus: Array<string | null | undefined>) => {
      const requestedSkus = getProductSKUs(skus);
      if (!requestedSkus.length) {
        return;
      }

      const ready =
        isConnected || (await initializeIap({ restoreStore: false }));

      if (!ready) {
        return;
      }

      await loadProducts(requestedSkus, {
        force: requestedSkus.some((sku) => !hasProduct(sku)),
      });
    },
    [hasProduct, initializeIap, isConnected, loadProducts],
  );

  const value = useMemo<IAPContextType>(
    () => ({
      isConnected,
      isInitializing,
      isPurchasing,
      isRestoring,
      error,
      products,
      getProduct,
      isPurchased: isSkuPurchased,
      purchaseProduct,
      ensureProductLoaded,
      ensureProductsLoaded,
      restorePurchases,
    }),
    [
      error,
      ensureProductLoaded,
      ensureProductsLoaded,
      getProduct,
      isConnected,
      isInitializing,
      isPurchasing,
      isRestoring,
      isSkuPurchased,
      products,
      purchaseProduct,
      restorePurchases,
    ],
  );

  return <IAPContext.Provider value={value}>{children}</IAPContext.Provider>;
}

export function useGigglamIAPContext() {
  const context = useContext(IAPContext);

  if (!context) {
    throw new Error("useGigglamIAPContext must be used within IAPProvider");
  }

  return context;
}
