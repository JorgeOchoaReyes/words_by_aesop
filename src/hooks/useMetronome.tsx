/* eslint-disable @typescript-eslint/no-misused-promises */
import React from "react";  

export const useMetronome = (
  soundRef: React.RefObject<HTMLAudioElement>, 
  soundRef2: React.RefObject<HTMLAudioElement>
) => {
  const [bpm, setBpm] = React.useState(60);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const [beatsPerMeasure, setBeatsPerMeasure] = React.useState(4);

  const playClick = React.useCallback(() => { 
    if(bpm > 50 && soundRef.current && soundRef2.current) {
      soundRef2.current.playbackRate = 2;    
      soundRef.current.playbackRate = 2;
    }
    if(bpm > 100 && soundRef.current && soundRef2.current) {
      soundRef2.current.playbackRate = 3;
      soundRef.current.playbackRate = 3;
    } 
    if(bpm > 200 && soundRef.current && soundRef2.current) {
      soundRef2.current.playbackRate = 4;    
      soundRef.current.playbackRate = 4;
    }
    if(bpm < 50 && soundRef.current && soundRef2.current) {
      soundRef2.current.playbackRate = 1;    
      soundRef.current.playbackRate = 1;
    }
    setCount((prevCount) => {
      if((prevCount+1) % beatsPerMeasure === 0) {
        soundRef2.current?.play().then(() => {
          console.log("___2");
        }).catch((error) => {
          console.log("Error playing sound: ", error);
        });
      }
      else {  
        soundRef.current?.play().then(() => {
          console.log("___1");
        }).catch((error) => {
          console.log("Error playing sound: ", error);
        });
      }
      return (prevCount + 1) % beatsPerMeasure;
    });
  }, [beatsPerMeasure, bpm, count, soundRef, soundRef2]);

  const startStop = () => {
    setIsPlaying(!isPlaying);
  };

  React.useEffect(() => {
    if (isPlaying) { 
      const timer = setInterval(playClick, (60 / bpm) * 1000);
      return () => clearInterval(timer);
    }
  }, [isPlaying, bpm, playClick]);

  return { bpm, setBpm, isPlaying, startStop, count, beatsPerMeasure, setBeatsPerMeasure, };
};