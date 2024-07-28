import React, { use } from "react";  
import { type GeniusSongReference } from "~/schema";
import { api } from "~/utils/api";

interface SearchSongModalProps {
  setCurrentText: (text: string) => void;
}

export const SearchSongModal: React.FC<SearchSongModalProps> = ({ setCurrentText }) => {
  const [text, setText] = React.useState<string>("");
  const searchGenius = api.geniusRouter.searchSongs.useMutation();
  const searchSong = api.geniusRouter.getSong.useMutation();
  const [songReferences, setSongReferences] = React.useState<GeniusSongReference[]>([]); 
  const refTempElement = React.useRef<HTMLDivElement | null>(null); 
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <dialog id="genius_modal_1" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Search Popular Songs!</h3>
          <p className="py-4">Search for your favorite songs.</p>
          <div className="modal-content flex flex-col"> 
            <input
              type="text"
              placeholder="Search for a song"
              className="input input-bordered w-full max-w-xs mb-5"
              value={text}
              autoFocus
              onMouseEnter={(e) => e.preventDefault()}
              onChange={(e) => { 
                setText(e.target.value);
              }}
            />  
            <button
              className="btn btn-success w-full max-w-xs mb-5"
              onClick={async () => {
                const res = await searchGenius.mutateAsync({ text });
                if(res.songs) {
                  setSongReferences(res.songs);
                }
              }}
            >
              {searchGenius.isPending ? <><span className="loading loading-spinner"></span>loading</> : "Search"}
            </button>
          </div> 
          <div className="flex flex-col h-[45vh] w-full overflow-y-auto">
            {
              songReferences.map((song) => {
                return (
                  <div key={song.id} className="modal-content">
                    <div className="flex flex-row my-5"> 
                      <img src={song.image} alt={song.name} className="w-32 h-32 mr-3" />
                      <h4 className="font-bold text-lg mr-3">{song.name}</h4>
                      <button className="btn btn-accent" onClick={async () => {
                        const res = await searchSong.mutateAsync({ api_path: song.api_path });
                        if(res.song) {
                          const songScript = res.song.lyrics;
                          setCurrentText(songScript);
                          closeButtonRef.current?.click();
                        }  
                      }
                      }> {searchSong.isPending ? <><span className="loading loading-spinner"></span>loading</> : "Copy Lyrics"}</button>
                    </div>
                  </div>
                );
              })
            } 
          </div>
          <div className="modal-action">
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button  ref={closeButtonRef} className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>
      <div ref={refTempElement} />
    </>
  );
};