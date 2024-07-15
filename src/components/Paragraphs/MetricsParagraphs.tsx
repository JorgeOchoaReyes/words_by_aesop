import React from "react"; 

interface MetricsParagraphsProps {
    phonoticsCount: Record<string, number>;
    uniqueWords: Record<string, number>;
}

export const MetricsParagraphs: React.FC<MetricsParagraphsProps> = ({
  phonoticsCount,
  uniqueWords,
}) => {

  return (
    <>
      <div className="h-[40vh] w-[40%] overflow-scroll ">
        <table className="table-auto w-[100%] mb-10 bg-neutral">
          <thead>
            <tr> 
              <th className="px-4 py-2">Phonemes</th>
              <th className="px-4 py-2">Count</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(phonoticsCount).sort((a, b) => (phonoticsCount?.[b] ?? 0) - (phonoticsCount?.[a] ?? 0)).map((word, index) => {
              return (
                <tr key={index}>
                  <td className="border px-4 py-2">{word}</td>
                  <td className="border px-4 py-2">{phonoticsCount[word]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="h-[40vh] w-[40%] overflow-scroll ">
        <table className="table-auto w-[100%] mb-10 bg-neutral">
          <thead>
            <tr> 
              <th className="px-4 py-2">Words</th>
              <th className="px-4 py-2">Count</th> 
            </tr>
          </thead>
          <tbody>
            {Object.keys(uniqueWords).sort((a, b) => (uniqueWords?.[b] ?? 0) - (uniqueWords?.[a] ?? 0)).map((word, index) => {
              return (
                <tr key={index+word}>
                  <td className="border px-4 py-2">{word}</td>
                  <td className="border px-4 py-2">{uniqueWords[word]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};