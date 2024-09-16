/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"; 
import { SlickTable } from "../Table/SlickTable";

interface MetricsParagraphsProps {
    phonoticsCount: Record<string, number>;
    uniqueWords: Record<string, number>;
}

export const MetricsParagraphs: React.FC<MetricsParagraphsProps> = ({
  phonoticsCount,
  uniqueWords,
}) => {

  const phonomesCount = Object.keys(phonoticsCount).sort((a, b) => (phonoticsCount?.[b] ?? 0) - (phonoticsCount?.[a] ?? 0)).map((word) => {
    return {
      Phonemes: word ?? "",
      Count: phonoticsCount[word] ?? 1,
    };
  });
  const uniqueWordsCount = Object.keys(uniqueWords).sort((a, b) => (uniqueWords?.[b] ?? 0) - (uniqueWords?.[a] ?? 0)).map((word) => {
    return {
      Words: word ?? "",
      Count: uniqueWords[word] ?? 1,
    };
  }); 

  return (
    <> 
      <SlickTable 
        data={phonomesCount ?? []}
        tableTitle={"Phonemes Count"}
      />  
      <SlickTable 
        data={uniqueWordsCount ?? []}
        tableTitle={"Unique Words Count"}
      /> 
    </>
  );
};