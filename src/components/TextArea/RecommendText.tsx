import React from "react"; 
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

export const RecommendText: React.FC<{
    rhymingWords: {
        highlyRhyming: string[];
        rhyming: string[];
        somewhatRhyming: string[];
    };
    cleanText: (text: string, removePunctuation: boolean, removeNumbers: boolean, removeExtraSpaces: boolean) => string;
    currentText: string;
    setCurrentText: (text: string) => void;
    processText: (text: string) => Promise<void>;
    showAllRhyming: {
        highlyRhyming: boolean;
        rhyming: boolean;
        somewhatRhyming: boolean;
    }; 
    setShowAllRhyming:  React.Dispatch<React.SetStateAction<{
        highlyRhyming: boolean;
        rhyming: boolean;
        somewhatRhyming: boolean;
    }>>
}> = ({
  rhymingWords,
  cleanText,
  currentText,
  setCurrentText,
  processText, 
  showAllRhyming, 
  setShowAllRhyming
}) => {
  return (
    <motion.div
      className="w-full md:max-w-[50vw] sm:max-w-[98vw] rounded-lg shadow-lg p-5 border2 border-gray-600" 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {
        Object.keys(rhymingWords).map((typeOfWords) => {
          const label = typeOfWords === "highlyRhyming" ? "Highly Rhyming" : typeOfWords === "somewhatRhyming" ? "Somewhat Rhyming" : "Rhyming";
          const bgColor = typeOfWords === "highlyRhyming" ? "bg-red-500" : typeOfWords === "somewhatRhyming" ? "bg-yellow-500" : "bg-green-500";
          return (
            <motion.div key={typeOfWords} className="flex flex-col">
              <motion.div className="flex items-center justify-between"
                onClick={() => {
                  setShowAllRhyming({
                    ...showAllRhyming,
                    [typeOfWords as keyof typeof showAllRhyming]: !showAllRhyming[typeOfWords as keyof typeof showAllRhyming],
                  });
                }}
              >
                <h2 className={`text-lg mb-5 font-bold mt-5 bg-[${bgColor}]`}> {label} {"("}{rhymingWords?.[typeOfWords as keyof typeof rhymingWords].length ?? 0}{")"}: </h2>
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: showAllRhyming[typeOfWords as keyof typeof showAllRhyming] ? 180 : 0 }}
                  transition={{ duration: 0.5 }}
                  className="cursor-pointer"
                >
                  {showAllRhyming[typeOfWords as keyof typeof showAllRhyming] ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </motion.div>
              </motion.div>
              <AnimatePresence>
                {
                  showAllRhyming[typeOfWords as keyof typeof showAllRhyming] && (
                    <motion.span
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex flex-wrap overflow-y-auto max-h-80"
                      transition={{ duration: 0.5 }}
                    >
                      {
                        rhymingWords?.[typeOfWords as keyof typeof rhymingWords]?.map((word, index) => {
                          if(index > 20 && !showAllRhyming[typeOfWords as keyof typeof showAllRhyming]) {
                            return;
                          }
                          return (
                            <motion.a 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.5 }}
                              key={word} onClick={async () => {
                                const newText = cleanText(`${currentText} ${word}`, false, false, false); 
                                setCurrentText(cleanText(newText, false, false, false));  
                                await processText(cleanText(newText, false, false, false));
                              }} className="text-md mx-2 underline cursor-pointer"> {word}, </motion.a>
                          );
                        })
                      }
                    </motion.span>
                  )
                }
              </AnimatePresence> 
            </motion.div>
        
          );
        })
      }
    </motion.div>
  );
};