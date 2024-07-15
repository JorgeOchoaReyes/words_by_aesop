import React from "react"; 

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
    <div style={{ 
      width: "100%", 
      justifyContent: "start",
      backgroundColor: "#f7f7f7",
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
            const ifTextCountIsOne = phonoticsCount[phonotic] === 1;
            const textWhite = (checkIfColorIsDark(phonoticsAsMatchingColors[phonotic] ?? "")) ? "text-black" : "text-black";
            return <span className={textWhite} key={phonotic} style={{
              backgroundColor: !ifTextCountIsOne ? phonoticsAsMatchingColors[phonotic]: "", 
              color: ifTextCountIsOne ? "black" : "white",
              marginLeft: 3
            }}>{phonotic}</span>;
          }); 

          if(!paragraphs[paragraphIndex]) {
            paragraphs[paragraphIndex] = [];
          }
          paragraphs[paragraphIndex]?.push(
            <div key={index} className="flex flex-col mx-2">
              <div key={word} className="text-sm text-center">{word}  </div>   
              <div className="text-md text-center ml-1"> {colorPhontics}</div>
            </div>
          ); 
        }).flat();

        return Object.values(paragraphs).map((paragraph, index) => {
          return (
            <span key={index} className="flex flex-row justify-start items-start">
              {paragraph}
            </span>
          );
        });
      })() 
      }
    </div>
  );
};
