import React from "react";  
import { api } from "~/utils/api";
 
export const SearchSongModal: React.FC = () => {
  const [text, setText] = React.useState<string>("Kendrick Lamar");
  const searchGenius = api.geniusRouter.searchSong.useMutation();



  return (
    <dialog id="genius_modal_1" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Hello!</h3>
        <p className="py-4">Press ESC key or click the button below to close</p>
        <div className="modal-content">
          <form method="dialog">
            <input
              type="text"
              placeholder="Search for a song"
              className="input input-bordered w-full max-w-xs mb-5"
              value={text}
              autoFocus
              onChange={(e) => {
                setText(e.target.value);
              }}
            />
          </form>
          <button
            className="btn"
            onClick={async () => {
              await searchGenius.mutateAsync({ text });
            }}
          >
            {searchGenius.isPending ? <><span className="loading loading-spinner"></span>loading</> : "Search"}
          </button>
        </div>
        <div className="modal-action">
          <form method="dialog">
            {/* if there is a button in form, it will close the modal */}
            <button className="btn">Close</button>
          </form>
        </div>
      </div>
    </dialog>
  );
};