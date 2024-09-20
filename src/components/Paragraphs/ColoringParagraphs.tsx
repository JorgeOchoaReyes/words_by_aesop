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
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }} 
      className="bg-neutral shadow-lg rounded-lg p-5 min-h-[350px] max-h-[400px] w-full bg-secondary overflow-auto"    
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
          word = word.replace(/[^0-9A-Za-z']/g, "").toLowerCase();
          const phonotics = phonoticParagraph[word]; 
          const colorPhontics = phonotics?.split(" ").map((phonotic) => { 
            const textWhite = (checkIfColorIsDark(phonoticsAsMatchingColors[phonotic] ?? "")) ? "text-white" : "text-white";
            return <span className={textWhite} key={phonotic} style={{
              backgroundColor: phonoticsAsMatchingColors[phonotic], 
              color: "black",
              marginLeft: 3,
            }}>{phonotic}</span>;
          }); 

          if(!paragraphs[paragraphIndex]) {
            paragraphs[paragraphIndex] = [];
          }
          const textWordSize = "text-[.8rem]";
          const textPhonoticsSize = "text-[1rem]";
          paragraphs[paragraphIndex]?.push(
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              key={index} className="flex flex-col mx-2">
              <div key={word} className={`text-sm text-center ${textWordSize}`}>{word}  </div>   
              <div className={`text-md ${textPhonoticsSize} text-center ml-1`}> {colorPhontics}</div>
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
            return (
              <motion.span
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05, transition: { duration: 0.5 }, }} 
                transition={{ duration: 0.5 }}
                key={index} 
                className="flex flex-row justify-start items-start cursor-pointer bg-transparent hover:bg-amber-300 transition-all duration-0 rounded-md">
                {paragraph}
              </motion.span>
            );
          }); 
        
      })() 
      }
    </motion.div>
  );
};
