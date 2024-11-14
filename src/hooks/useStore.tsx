import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface Store {
    paragraphs: string;
    songName: string; 
    saveParagraphs: (paragraphs: string) => void;
    clearParagraphs: () => void;
    setSongName: (songName: string) => void;
    clearSongName: () => void;
    allowFindWordsThatRhyme: boolean;
    setAllowFindWordsThatRhyme: (allowFindWordsThatRhyme: boolean) => void;
}

export const useStore = create(
  persist<Store>(
    (set, get) => ({
      paragraphs: "",
      songName: "",
      allowFindWordsThatRhyme: false,
      setAllowFindWordsThatRhyme: (allowFindWordsThatRhyme) => set({ allowFindWordsThatRhyme: allowFindWordsThatRhyme }),
      saveParagraphs: (paragraphs) => set({ paragraphs: paragraphs }),
      clearParagraphs: () => set({ paragraphs: "" }),
      setSongName: (songName) => set({ songName: songName }),
      clearSongName: () => set({ songName: "" }),
    }),
    {
      name: "wrods-by-aesop-storage", 
      storage: createJSONStorage(() => localStorage), 
    },
  ),
);