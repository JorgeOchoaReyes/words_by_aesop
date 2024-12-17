/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Head from "next/head";
import React, { useEffect, useState } from "react";     
import FancyMetronome from "~/components/Metronome";
import { motion } from "framer-motion"; 
import { api } from "~/utils/api"; 
import { TypingGame } from "~/components/Games/findRhymes"; 
import dynamic from "next/dynamic"; 
import { GradientButton } from "~/components/Button/GradientButton";

// Dynamically import react-confetti to avoid SSR issues
const ReactConfetti = dynamic(() => import("react-confetti"), { ssr: false });

export default function Home() {    
 
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isConfettiActive, setIsConfettiActive] = useState(false);

  useEffect(() => {
    function updateDimensions() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const startCelebration = () => {
    setIsConfettiActive(true);
    setTimeout(() => setIsConfettiActive(false), 5000); // Stop after 5 seconds
  };

  return (  
    <>
      <Head>
        <title>Words By Aesop</title>
        <meta name="description" content="Discover the ultimate text analysis tool! Our website offers precise word count, identifies unique words, provides pronunciation, and tracks vowel usage. Enhance your writing with our comprehensive text analysis!" />
        <meta name="keywords" content="text analysis, word count, unique words, pronunciation, vowel usage" />
        <meta name="author" content="Jorge Reyes" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        <meta property="og:title" content="Words By Aesop" />
        <meta property="og:description" content="Discover the ultimate text analysis tool! Our website offers precise word count, identifies unique words, provides pronunciation, and tracks vowel usage. Enhance your writing!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://wordsbyaesop.com" />
        <meta property="og:image" content="https://wordsbyaesop.com/og-image.png" />
        <meta property="og:site_name" content="Words By Aesop" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Words By Aesop" />
        <meta name="twitter:description" content="Discover the ultimate text analysis tool! Our website offers precise word count, identifies unique words, provides pronunciation, and tracks vowel usage. Enhance your writing with our comprehensive text analysis!" />
        <meta name="twitter:image" content="https://wordsbyaesop.com/og-image.png" />
        <meta name="twitter:site" content="@wordsbyaesop" />
        <meta name="twitter:creator" content="@wordsbyaesop" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="canonical" href="https://wordsbyaesop.com" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" href="/favicon.ico" />
      </Head> 
      <main className="flex min-h-screen flex-col items-center bg-gradient-to-b w-full">   
        <div className="flex w-full md:justify-around sm:justify-center mt-14 xs:flex-col md:flex-row">
          <h1 className="text-5xl font-bold flex md:justify-around xs:justify-center text-center items-center xs:flex-col md:flex-row">
            <motion.img
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.1 }}
              onClick={() => {
                window.open("https://www.youtube.com/@aesoprockwins", "_blank");
              }}
              className="h-32 w-32 rounded-full mr-5 cursor-pointer" 
              src="./None_shall_pass_aes_rock.jpg"
            /> 
          Words by Aesop
          </h1>
          <FancyMetronome /> 
        </div>   
        <TypingGame startCelebration={startCelebration} /> 
        <div className="bg-white flex sm:self-center mt-10">
          <GradientButton text="Analyze song lyrics!" linkTo="/" />
        </div> 
        {isConfettiActive && (
          <ReactConfetti
            width={dimensions.width}
            height={dimensions.height}
            recycle={false}
            numberOfPieces={500}
          />
        )}
      </main>
    </>
  );
}

 