import Head from "next/head";
import React, { useEffect } from "react";   
import { MetricsParagraphs } from "~/components/Paragraphs/MetricsParagraphs";
import { ColorPraragraphs } from "~/components/Paragraphs/ColoringParagraphs";
import { useMetronome } from "~/hooks/useMetronome";
import { useStore } from "~/hooks/useStore";
import { api } from "~/utils/api";
import { MetronmoeControl } from "~/components/Controls/Metronome";

export default function Home() { 
  const findPhonemes = api.rhymes.findPhonemes.useMutation(); 
  const [currentText, setCurrentText] = React.useState<string>(""); 
  const [phonoticParagraph, setPhonoticParagraph] = React.useState<Record<string, string>>({});
  const [phonoticsCount, setPhonoticsCount] = React.useState<Record<string, number>>({});
  const [uniqueWords, setUniqueWords] = React.useState<Record<string, number>>({});
  const [phonoticsAsMatchingColors, setPhonoticsAsMatchingColors] = React.useState<Record<string, string>>({} as Record<string, string>);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const audioRef2 = React.useRef<HTMLAudioElement>(null);
  const store = useStore();
  const storedParagraphs = useStore((state) => state.paragraphs);
  const metronome = useMetronome(audioRef, audioRef2);

  const cleanText = (text: string, skipLines=true, skipSpecialChars=true, skipDoubleSpaes=true): string => {
    let newText = text;
    if(skipLines) {
      newText = newText.replaceAll("\n", " ");
    }
    if(skipSpecialChars) {
      newText = newText.replaceAll("\t", " ");
    }
    if(skipDoubleSpaes) {
      newText = newText.replaceAll("  ", " ");
    }
    return newText;
  };
  const checkIfColorIsDark = (hex: string): boolean => {
    const c = hex.substring(1);
    const rgb = parseInt(c, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >>  8) & 0xff;
    const b = (rgb >>  0) & 0xff;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma < 100;
  };  
  const countOfPhonotics = (phonotics: Record<string, string>, text: string): Record<string, number> => {
    const counts = {} as Record<string, number>;
    (text).replaceAll("\n"," <br/> ").split(" ").forEach((word) => { 
      if(word === "<br />" || word === "<br/>" || word === " ") {
        return;
      }
      const phonoticsRecord = phonotics[word];
      const splitPhonotic = phonoticsRecord?.split(" ");
      splitPhonotic?.forEach((phonotic) => {
        if(!counts[phonotic]) {
          counts[phonotic] = 0;
        }
        counts[phonotic] = counts[phonotic] + 1;
      });
    });  
    return counts;
  };
  const uniqueWordsCount = (text: string): Record<string, number> => {  
    const words = text.replaceAll("\n", " ").split(" ").filter((word) => word.trim() !== ""); 
    const wordsRecords = {} as Record<string, number>;
    words.forEach((word) => {
      if(!wordsRecords[word]) {
        wordsRecords[word] = 0;
      }
      wordsRecords[word] = wordsRecords[word] + 1;
    });
    return wordsRecords;    
  };
  const processText = async (text: string) => {
    const res = await findPhonemes.mutateAsync({ text: cleanText(text) }); 
    if(res.words) {
      Object.keys(res.words).forEach((word) => {
        const newPhonotic = (res.words[word] ?? ""); 
        const splitPhonotic = newPhonotic.split(" "); 
        splitPhonotic.forEach((phonotic) => {
          if(!phonoticsAsMatchingColors[phonotic]) { 
            phonoticsAsMatchingColors[phonotic] = `#${Math.floor(Math.random()*16777215).toString(16)}`;
          } 
        });
        setPhonoticsAsMatchingColors({
          ...phonoticsAsMatchingColors, 
        });
      });  
      const wordCount = uniqueWordsCount(text);
      setUniqueWords(wordCount);
      const counts = countOfPhonotics(res.words, text);
      setPhonoticsCount(counts);
      setPhonoticParagraph(res.words);
    } 
  };

  useEffect(() => {
    const paragraphs = storedParagraphs; 
    if(paragraphs && paragraphs.length > 0) {
      setCurrentText(paragraphs);
      processText(paragraphs).then(() => {
        console.log("Processed text");
      }).catch((err) => {
        console.error(err);
      });
    }
  }, [storedParagraphs]);
  
  return (  
    <>
      <Head>
        <title>Words By Aesop</title>
        <meta name="description" content="Discover the ultimate text analysis tool! Our website offers precise word count, identifies unique words, provides pronunciation, and tracks vowel usage. Enhance your writing with our comprehensive text analysis services today!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <audio src={"/metronome.mp3"} ref={audioRef} />  
      <audio src={"/metronome-85688.mp3"} ref={audioRef2} />  
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b ">
        <h1 className="text-5xl font-bold mb-14 mt-20">
          Words by Aesop
        </h1>
        <div className="flex w-96">
          <MetronmoeControl 
            startStop={metronome.startStop}
            setBpm={metronome.setBpm}
            bpm={metronome.bpm}
            isPlaying={metronome.isPlaying}
            count={metronome.count}
            setBeatsPerMeasure={metronome.setBeatsPerMeasure}
            beatsPerMeasure={metronome.beatsPerMeasure}
          />
        </div>
        <div className="container flex flex-col items-center justify-center h-full"> 
          <h2 className="text-2xl mb-5 underline self-start"> Total Words: <b> {Object.values(uniqueWords).reduce((acc, curr) => acc + curr, 0)}</b> Unique Words: <b> {Object.keys(uniqueWords).length}</b> </h2> 
          <div className="flex flex-row w-full h-[40vh] justify-around">
            <textarea   
              placeholder="Type here" 
              className="textarea w-[60%] mb-10 bg-neutral"
              rows={10}
              value={currentText}
              onChange={async (e) => {  
                if(e.target.value.endsWith(" ") || e.target.value.endsWith("\n")) {
                  setCurrentText(cleanText(e.target.value, false, false, false));  
                  await processText(cleanText(e.target.value, false, false, false));
                  return;
                }  
                setCurrentText(cleanText(e.target.value, false, false, false));  
              }} 
            />   
            <div className="w-[40%] flex flex-row justify-around h-[30vh]">         
              <MetricsParagraphs 
                phonoticsCount={phonoticsCount}
                uniqueWords={uniqueWords}
              />
            </div>
          </div>
          <button className="btn btn-secondary w-[25%] mb-10"
            onClick={async () => {
              setCurrentText(cleanText(currentText, false, false, false));  
              await processText(cleanText(currentText, false, false, false));
            }}
          > 
            Check
          </button>
          <div className="flex flex-row w-fit justify-center">
            <button className="btn btn-error mr-5 w-[100%] mb-10"
              onClick={async () => {
                store.clearParagraphs();
              }}
            >
            Clear Storage
            </button>
            <button className="btn btn-success w-[100%] mb-10"
              onClick={async () => {
                store.saveParagraphs(currentText);
              }}
            >
            Save Progress
            </button>
          </div>
          <div className="w-[80%] flex-col justify-center items-center mb-96">
            <ColorPraragraphs 
              currentText={currentText}
              phonoticParagraph={phonoticParagraph}
              phonoticsCount={phonoticsCount}
              phonoticsAsMatchingColors={phonoticsAsMatchingColors}
              checkIfColorIsDark={checkIfColorIsDark}
            />
          </div>
        </div>
      </main>
    </>
  );
}

 