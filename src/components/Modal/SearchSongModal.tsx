import React, { use } from "react";  
import { type GeniusSongReference } from "~/schema";
import { api } from "~/utils/api";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { CopyIcon, SearchIcon, X } from "lucide-react";
import { Loading } from "../Loading";

interface SearchSongModalProps {
  setCurrentText: (text: string) => void;
  isOpen: boolean;
  toggleModal: () => void;
}

export const SearchSongModal: React.FC<SearchSongModalProps> = ({ setCurrentText, isOpen, toggleModal }) => {
  const [text, setText] = React.useState<string>("");
  const searchGenius = api.geniusRouter.searchSongs.useMutation();
  const searchSong = api.geniusRouter.getSong.useMutation();
  const [songReferences, setSongReferences] = React.useState<GeniusSongReference[]>([]);   

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleModal}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-10"
            >
              <h3 className="font-bold text-lg">Search Popular Songs!</h3>
              <p className="py-4">Search for your favorite songs.</p>
              <div className="modal-content flex flex-col"> 
                <input
                  type="text"
                  placeholder="Search for a song"
                  className="w-full max-w-xs px-3 py-2 mb-3 text-sm leading-tight text-gray-700 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200 ease-in-out" 
                  value={text}
                  autoFocus
                  onMouseEnter={(e) => e.preventDefault()}
                  onChange={(e) => { 
                    setText(e.target.value);
                  }}
                />  
                <Button
                  className=" w-full max-w-xs mb-5 content-center items-center justify-center flex bg-[#ffff63] hover:bg-[#ffff76] text-black font-bold"
                  onClick={async () => {
                    const res = await searchGenius.mutateAsync({ text });
                    if(res.songs) {
                      setSongReferences(res.songs);
                    }
                  }}
                >
                  {searchGenius.isPending ? <Loading />  : <> <SearchIcon className="mr-3" /> Search</>}
                </Button>
              </div> 
              <div className="flex flex-col h-[45vh] w-full overflow-y-auto">
                {
                  songReferences.map((song) => {
                    return (
                      <div key={song.id} className="modal-content">
                        <div className="flex flex-row my-5 justify-between px-3"> 
                          <img src={song.image} alt={song.name} className="w-32 h-32 mr-3" />
                          <h4 className="font-bold text-lg mr-3">{song.name}</h4>
                          <Button className="bg-green-600 hover:bg-green-500 content-center items-center justify-center flex" onClick={async () => {
                            const res = await searchSong.mutateAsync({ api_path: song.api_path });
                            if(res.song) {
                              const songScript = res.song.lyrics;
                              setCurrentText(songScript);
                              toggleModal();
                            }  
                          }
                          }> {searchSong.isPending ? <Loading /> : <> <CopyIcon className="mr-3" />  Copy Lyrics</>}</Button>
                        </div>
                      </div>
                    );
                  })
                } 
              </div>
              <div className="mt-5"> 
                <Button className="bg-red-500 hover:bg-red-600" onClick={toggleModal}>Close</Button> 
              </div> 
            </motion.div>
          </motion.div>
        )
        }
      </AnimatePresence>
    </>
  );
};