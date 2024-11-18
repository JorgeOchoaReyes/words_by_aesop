import React from "react"; 
import { motion } from "framer-motion";
import { syllableCount } from "~/utils/phonomes";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@radix-ui/react-hover-card";

interface ParagraphsColorProps {
    currentText: string;
    phonoticParagraph: Record<string, string>;
    phonoticsCount: Record<string, number>;
    phonoticsAsMatchingColors: Record<string, string>;
    checkIfColorIsDark: (hex: string) => string;
}
export const ColorPraragraphs: React.FC<ParagraphsColorProps> = ({
  currentText,
  phonoticParagraph, 
  phonoticsAsMatchingColors,
  checkIfColorIsDark,
}) => {
  const [isHovered, setIsHovered] = React.useState<Record<number, boolean>>({});
  return (
    <motion.div    
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }} 
      className="bg-neutral md:w-[100%] xs:w-[98vw] xs:w-max-[98vw] shadow-lg rounded-lg p-5 min-h-[350px] max-h-[400px] bg-secondary overflow-auto"    
      style={{  
        justifyContent: "start", 
        borderRadius: 10,
        padding: 20,
        overflowX: "auto"
      }}> 
      {(() => {
        const paragraphs = {} as Record<string, React.ReactNode[]>; 
        const paragraphDetailsIndex = {} as Record<number, {
          totalWords: number;
          totalPhonotics: number;
          totalSyllables: number;
        }>;
        
        let paragraphIndex = 0;

        let currentTotalWords = 0;
        let currentTotalPhonotics = 0;
        let currentTotalSyllables = 0;
        
        (currentText).replaceAll("\n"," <br/> ").split(" ").map((word, index) => {  
          if(word === "<br />" || word === "<br/>" || word === " ") {
            if(!paragraphDetailsIndex[paragraphIndex]) {
              paragraphDetailsIndex[paragraphIndex] = {
                totalWords: 0,
                totalPhonotics: 0,
                totalSyllables: 0,
              };
            } 
            paragraphDetailsIndex[paragraphIndex]!.totalWords = currentTotalWords;
            paragraphDetailsIndex[paragraphIndex]!.totalPhonotics = currentTotalPhonotics;
            paragraphDetailsIndex[paragraphIndex]!.totalSyllables = currentTotalSyllables; 
            paragraphIndex++;  
            currentTotalWords = 0;
            currentTotalPhonotics = 0;
            currentTotalSyllables = 0; 
            if(!paragraphs[paragraphIndex]) {
              paragraphs[paragraphIndex] = [];
            }
            paragraphs[paragraphIndex]?.push(<br />);
            paragraphIndex++;
            return;
          }
          word = word.replace(/[^0-9A-Za-z']/g, "").toLowerCase();
          const phonotics = phonoticParagraph[word]; 
          const colorPhontics = phonotics?.split(" ").map((phonotic, index) => { 
            const textColor = (checkIfColorIsDark(phonoticsAsMatchingColors[phonotic] ?? ""));
            return <span key={phonotic+index} style={{
              backgroundColor: phonoticsAsMatchingColors[phonotic], 
              color: textColor, 
            }}>{phonotic}</span>;
          });  
          if(!paragraphs[paragraphIndex]) {
            paragraphs[paragraphIndex] = [];
          }   
          const textWordSize = "text-[.8rem]";
          const textPhonoticsSize = "text-[1rem]"; 
          currentTotalWords++;
          currentTotalPhonotics += phonotics?.split(" ").length ?? 0;
          currentTotalSyllables += syllableCount(phonotics ?? "");  
          paragraphs[paragraphIndex]?.push(
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              key={index+word} className="flex flex-col mx-2">
              <div key={word} className={`text-lg text-center underline ${textWordSize}`}> {word}  </div>   
              <div className={`text-md ${textPhonoticsSize} text-center `}> {colorPhontics}</div>
            </motion.div>
          ); 
        }).flat(); 
        const isEmpty = Object.values(paragraphs).every((paragraph) => paragraph.length === 0);  
        // wave text animation
        const animtedTextForNoText = <motion.div> 
          <motion.span
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-row justify-start items-start">
            {"No text to analyze"}
          </motion.span>
        </motion.div>; 
        return  isEmpty ? 
          animtedTextForNoText
          : 
          Object.values(paragraphs).map((paragraph, index) => {
            const paragraphDetails = paragraphDetailsIndex[index];
            if(paragraph.length === 1 && (paragraph[0] as {type: string}).type === "br") { 
              return;
            } 
            return (
              <HoverCard key={index+"hover-card"} openDelay={100} closeDelay={100} open={isHovered[index]}>
                <HoverCardTrigger onClick={() => { 
                  const isMobile = window.innerWidth < 768;
                  if(isMobile) {
                    setIsHovered((prev) => ({ [index]: !prev[index] }));
                  } else {
                    setIsHovered({}); 
                  }
                }}>
                  <motion.span
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, transition: { duration: 0.5 }, }} 
                    transition={{ duration: 0.5 }} 
                    className="flex flex-row justify-start flex-wrap items-start cursor-pointer bg-transparent hover:bg-amber-300 transition-all duration-0 rounded-md">
                    {paragraph} 
                  </motion.span>
                  <hr className="my-3 border-black" />
                </HoverCardTrigger>
                <HoverCardContent align="end"> 
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col justify-start items-start bg-[#3c82f5] rounded-xl w-72">
                    <p className="text-lg mb-5 font-bold mt-1 text-white ml-5"> Total Words: <b>{paragraphDetails?.totalWords} </b> </p>
                    <p className="text-lg mb-5 font-bold mt-1 text-white ml-5"> Total Phonetics: <b>{paragraphDetails?.totalPhonotics} </b> </p>
                    <p className="text-lg mb-5 font-bold mt-1 text-white ml-5"> Total Syllables: <b>{paragraphDetails?.totalSyllables} </b> </p>
                  </motion.div> 
                </HoverCardContent>
              </HoverCard>
            );
          });  
      })() 
      }
    </motion.div>
  );
};
