import React from "react"; 

interface SearchSongModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SearchSongModal: React.FC<SearchSongModalProps> = () => {
  return (
    <div>
            Search Song Modal
    </div>
  );
};