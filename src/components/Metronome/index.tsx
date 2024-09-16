/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */ 

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Plus, Minus } from "lucide-react";

export default function FancyMetronome() {
  const [bpm, setBpm] = useState(120);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [count, setCount] = useState(0);

  const audioContext = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      if (audioContext.current) {
        (audioContext.current as any)?.close();
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const interval = 60000 / bpm;
      intervalRef.current = setInterval(() => {
        setCount((prevCount) => (prevCount + 1) % beatsPerMeasure);
        playClick();
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, bpm, beatsPerMeasure]);

  const playClick = () => {
    if (audioContext.current) {
      const oscillator = audioContext.current.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(count === 0 ? 1000 : 800, audioContext.current.currentTime);

      const gainNode = audioContext.current.createGain();
      gainNode.gain.setValueAtTime(1, audioContext.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.current.currentTime + 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.current.destination);

      oscillator.start();
      oscillator.stop(audioContext.current.currentTime + 0.1);
    }
  };

  const handleBpmChange = (increment: number) => {
    setBpm((prevBpm) => Math.max(30, Math.min(300, prevBpm + increment)));
  };

  const handleBeatsPerMeasureChange = (increment: number) => {
    setBeatsPerMeasure((prevBeats) => Math.max(1, Math.min(12, prevBeats + increment)));
  }; 

  return ( 
    <motion.div
      className="bg-white rounded-3xl p-8"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    > 
      <div className="flex justify-center mb-8"> 
      </div>  <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center mb-6">
        <div className="text-gray-800 mr-5">
          <h3 className="text-xl font-semibold mb-2">BPM</h3>
          <div className="flex items-center">
            <button
              onClick={() => handleBpmChange(-1)}
              className="bg-gray-200 rounded-full p-2 hover:bg-gray-300 transition-colors"
            >
              <Minus size={24} className="text-gray-600" />
            </button>
            <span className="text-2xl font-bold mx-4">{bpm}</span>
            <button
              onClick={() => handleBpmChange(1)}
              className="bg-gray-200 rounded-full p-2 hover:bg-gray-300 transition-colors"
            >
              <Plus size={24} className="text-gray-600" />
            </button>
          </div>
        </div>
        <div className="text-gray-800">
          <h3 className="text-xl font-semibold mb-2">Beats/Measure</h3>
          <div className="flex items-center">
            <button
              onClick={() => handleBeatsPerMeasureChange(-1)}
              className="bg-gray-200 rounded-full p-2 hover:bg-gray-300 transition-colors"
            >
              <Minus size={24} className="text-gray-600" />
            </button>
            <span className="text-2xl font-bold mx-4">{beatsPerMeasure}</span>
            <button
              onClick={() => handleBeatsPerMeasureChange(1)}
              className="bg-gray-200 rounded-full p-2 hover:bg-gray-300 transition-colors"
            >
              <Plus size={24} className="text-gray-600" />
            </button>
          </div>
        </div>
      </motion.div> 

      <motion.button
        className={`w-full ${isPlaying ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"} text-white text-xl font-bold py-3 rounded-full transition-colors`} 
        animate={{ 
          scale: count === 0 ? 1.1 : 1,
          backgroundColor: count === 0 ? "#3B82F6" : "#60A5FA"
        }}
        transition={{ duration: 0.1 }} 
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying ? count + 1 : <Play size={24} className="mx-auto" />}
      </motion.button>
    </motion.div> 
  );
}