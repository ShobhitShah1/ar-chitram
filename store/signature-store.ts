import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "@/utils/storage";
import { SignatureSelection } from "@/features/virtual-creativity/constants/editor-presets";

interface SignatureState {
  lastSignature: SignatureSelection | null;
  setLastSignature: (signature: SignatureSelection | null) => void;
}

export const useSignatureStore = create<SignatureState>()(
  persist(
    (set) => ({
      lastSignature: null,
      setLastSignature: (signature) => set({ lastSignature: signature }),
    }),
    {
      name: "signature-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
