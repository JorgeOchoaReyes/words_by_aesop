import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface Store {
    paragraphs: string;
    saveParagraphs: (paragraphs: string) => void;
    clearParagraphs: () => void;
}

export const useStore = create(
  persist<Store>(
    (set, get) => ({
      paragraphs: "",
      saveParagraphs: (paragraphs) => set({ paragraphs: paragraphs }),
      clearParagraphs: () => set({ paragraphs: "" }),
    }),
    {
      name: "wrods-by-aesop-storage", 
      storage: createJSONStorage(() => localStorage), 
    },
  ),
);