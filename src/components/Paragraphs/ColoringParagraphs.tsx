import React from "react"; 
import { motion } from "framer-motion";

interface ParagraphsColorProps {
    currentText: string;
    phonoticParagraph: Record<string, string>;
    phonoticsCount: Record<string, number>;
    phonoticsAsMatchingColors: Record<string, string>;
    checkIfColorIsDark: (hex: string) => boolean;
}
export const ColorPraragraphs: React.FC<ParagraphsColorProps> = ({
  currentText,
  phonoticParagraph,
  phonoticsCount,
  phonoticsAsMatchingColors,
  checkIfColorIsDark,
}) => {
  return (
    <motion.div   
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }} 
      className="bg-neutral shadow-lg rounded-lg p-5 min-h-[350px] w-full bg-secondary"    
      style={{ 
        width: "100%", 
        justifyContent: "start", 
        borderRadius: 10,
        padding: 20,
        overflowX: "auto"
      }}> 
      {(() => {
        const paragraphs = {} as Record<string, React.ReactNode[]>; 

        let paragraphIndex = 0;

        (currentText).replaceAll("\n"," <br/> ").split(" ").map((word, index) => {  
          if(word === "<br />" || word === "<br/>" || word === " ") {
            paragraphIndex++;
            if(!paragraphs[paragraphIndex]) {
              paragraphs[paragraphIndex] = [];
            }
            paragraphs[paragraphIndex]?.push(<br />);
            paragraphIndex++;
            return;
          }
          const phonotics = phonoticParagraph[word];
          const colorPhontics = phonotics?.split(" ").map((phonotic) => {
            const ifTextCountIsOne = (phonoticsCount[phonotic] ?? 0) >= 2;
            const textWhite = (checkIfColorIsDark(phonoticsAsMatchingColors[phonotic] ?? "")) ? "text-white" : "text-white";
            return <span className={textWhite} key={phonotic} style={{
              backgroundColor: ifTextCountIsOne ? phonoticsAsMatchingColors[phonotic]: "", 
              color: ifTextCountIsOne ? "black" : "white",
              marginLeft: 3
            }}>{phonotic}</span>;
          }); 

          if(!paragraphs[paragraphIndex]) {
            paragraphs[paragraphIndex] = [];
          }
          paragraphs[paragraphIndex]?.push(
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              key={index} className="flex flex-col mx-2">
              <div key={word} className="text-sm text-center">{word}  </div>   
              <div className="text-md text-center ml-1"> {colorPhontics}</div>
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

        return isEmpty ? 
          animtedTextForNoText
          :
          Object.values(paragraphs).map((paragraph, index) => {
            return (
              <motion.span
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                key={index} className="flex flex-row justify-start items-start">
                {paragraph}
              </motion.span>
            );
          });
      })() 
      }
    </motion.div>
  );
};
