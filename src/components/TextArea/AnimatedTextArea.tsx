import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const AnimatedTextArea: React.FC<{
    textValue: string;
    setTextValue: (value: string) => void;
    rows?: number;
    placeholder?: string;
}> = ({
  textValue,
  setTextValue,
  rows = 4,
  placeholder = "Enter text",
}) => { 
  return (
    <div className="w-[60%] flex ">
      <motion.div
        className="w-full p-3 rounded-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      > 
        <AnimatePresence mode="wait" initial={false}> 
          <motion.textarea
            key="textarea"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            className="w-full p-3 text-gray-700 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors duration-200"
            rows={rows}
            placeholder={placeholder}
            autoFocus
          /> 
        </AnimatePresence>
      </motion.div>
    </div>
  );
};