import React from "react";

interface MetronmoeControlProps {
    startStop: () => void;
    setBpm: (bpm: number) => void;
    setBeatsPerMeasure: (count: number) => void;
    bpm: number;
    isPlaying: boolean;
    count: number;
    beatsPerMeasure: number;
}

export const MetronmoeControl: React.FC<MetronmoeControlProps> = ({
  startStop,
  setBpm,
  bpm,
  isPlaying,
  count,
  setBeatsPerMeasure,
  beatsPerMeasure,
}) => {
  return (
    <div className="flex flex-col items-center border-slate-400 w-full">
      <div className="flex items-center flex-col justify-center w-full">
        <div className="text-lg mb-5">Count: {count+1}</div>
        <div className="flex flex-row justify-around w-full mb-6"> 
          <label htmlFor="bpm" className="text-lg">BPM:          
            <input 
              id="bpm"
              name="bpm"
              min="60"
              max="240"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
            />
          </label>   
          <label htmlFor="beatsPerMeasure" className="text-lg">Beats Per Measure: 
            <input 
              id="beatsPerMeasure"
              name="beatsPerMeasure"
              min="1"
              max="8"
              value={beatsPerMeasure}
              onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}
            />
          </label> 
        </div>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={startStop}>
          {isPlaying ? "Stop" : "Start"}
        </button>
      </div>
    </div>
  );
};