import Head from "next/head";
import React, { useEffect } from "react";   
import { MetricsParagraphs } from "~/components/Paragraphs/MetricsParagraphs";
import { ColorPraragraphs } from "~/components/Paragraphs/ColoringParagraphs"; 
import { useStore } from "~/hooks/useStore";  
import { dictionary } from "cmu-pronouncing-dictionary";
import { processPhonemes, findWordsThatRhyme } from "~/utils/phonomes";
import { GeniusLogo } from "~/components/Logos/Genius";
import { SearchSongModal } from "~/components/Modal/SearchSongModal";  
import { AnimatedTextArea } from "~/components/TextArea/AnimatedTextArea";
import { Button } from "~/components/ui/button";
import { RecommendText } from "~/components/TextArea/RecommendText";
import FancyMetronome from "~/components/Metronome";
import { SaveAllIcon, WashingMachineIcon, XCircleIcon } from "lucide-react"; 
import { useToast } from "~/hooks/use-toast";
import { motion } from "framer-motion";

export default function Home() {  
  const [currentText, setCurrentText] = React.useState<string>(""); 
  const [phonoticParagraph, setPhonoticParagraph] = React.useState<Record<string, string>>({});
  const [phonoticsCount, setPhonoticsCount] = React.useState<Record<string, number>>({});
  const [uniqueWords, setUniqueWords] = React.useState<Record<string, number>>({});
  const [phonoticsAsMatchingColors, setPhonoticsAsMatchingColors] = React.useState<Record<string, string>>({} as Record<string, string>); 
  const store = useStore();
  const storedParagraphs = useStore((state) => state.paragraphs); 
  const h2Ref = React.useRef<HTMLHeadingElement | null>(null);
  const [loading, setLoading] = React.useState(false);
  const {toast} = useToast();
  const [rhymingWords, setRhymingWords] = React.useState<{
    highlyRhyming: string[];
    rhyming: string[];
    somewhatRhyming: string[];
  }>({
    highlyRhyming: [],
    rhyming: [],
    somewhatRhyming: [],
  });
  const [showAllRhyming, setShowAllRhyming] = React.useState({
    highlyRhyming: false,
    rhyming: false,
    somewhatRhyming: false,
  });

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
    setLoading(true);
    const res = processPhonemes(text, dictionary); 
    if(res.words) {
      Object.keys(res.words).forEach((word) => {
        const newPhonotic = (res.words[word] ?? ""); 
        const splitPhonotic = newPhonotic.split(" "); 
        splitPhonotic.forEach((phonotic) => {
          if(!phonoticsAsMatchingColors[phonotic]) {  
            const makeValidColor = () => `#${Math.floor(Math.random()*16777215).toString(16)}`;
            const ensureColorHasSixChars = (color: string) => {
              console.log("Color: ", color.length);
              if(color.length < 7) { 
                const dif = 6 - color.length;
                let newColor = color;
                for(let i = 0; i <= dif; i++) {
                  newColor = `${newColor}0`;
                } 
                return newColor;
              }
              return color;
            };
            phonoticsAsMatchingColors[phonotic] = `${ensureColorHasSixChars(makeValidColor())}`;
          } else {
            return;
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
    const lastWord = text.split(" ").filter((a) => a.trim() !== "").pop();  
    if(lastWord) {
      const rhymes = findWordsThatRhyme(lastWord, dictionary);
      setRhymingWords(rhymes); 
    }
    setLoading(false);
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
        <meta name="keywords" content="text analysis, word count, unique words, pronunciation, vowel usage" />
        <meta name="author" content="Jorge Reyes" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        <meta property="og:title" content="Words By Aesop" />
        <meta property="og:description" content="Discover the ultimate text analysis tool! Our website offers precise word count, identifies unique words, provides pronunciation, and tracks vowel usage. Enhance your writing with our comprehensive text analysis services today!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://wordsbyaesop.com" />
        <meta property="og:image" content="https://wordsbyaesop.com/og-image.png" />
        <meta property="og:site_name" content="Words By Aesop" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Words By Aesop" />
        <meta name="twitter:description" content="Discover the ultimate text analysis tool! Our website offers precise word count, identifies unique words, provides pronunciation, and tracks vowel usage. Enhance your writing with our comprehensive text analysis services today!" />
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
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b w-full">   
        <div className="flex w-full justify-around mt-14">
          <h1 className="text-5xl font-bold flex flex-row items-center">
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
        <div className="flex flex-col items-center h-full"> 
          <h2 ref={h2Ref} className="text-2xl mb-5 underline self-start"> Total Words: <b> {Object.values(uniqueWords).reduce((acc, curr) => acc + curr, 0)}</b> Unique Words: <b> {Object.keys(uniqueWords).length}</b> </h2> 
          <div className="flex flex-row w-[100%] justify-around"> 
            <AnimatedTextArea   
              placeholder="Type here"  
              rows={13}
              textValue={currentText}
              setTextValue={async (e) => {  
                if(h2Ref) {
                  // scroll text box to top of page 
                  h2Ref.current?.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
                } 
                if(e.endsWith(" ") || e.endsWith("\n")) {
                  setCurrentText(cleanText(e, false, false, false));  
                  await processText(cleanText(e, false, false, false));
                  return;
                }  
                setCurrentText(cleanText(e, false, false, false));  
              }} 
            />    
            <div className="w-[50vw] flex-col justify-center items-center mb-10">
              <ColorPraragraphs 
                currentText={currentText}
                phonoticParagraph={phonoticParagraph}
                phonoticsCount={phonoticsCount}
                phonoticsAsMatchingColors={phonoticsAsMatchingColors}
                checkIfColorIsDark={checkIfColorIsDark}
              />
            </div>
          </div>   
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}  
            className="flex flex-row w-fit justify-center">
            <Button className="btn bg-[#ffff63] hover:bg-[#ffff76] mr-3 w-[100%] mb-10 text-black active:scale-75 transition-all"
              onClick={()=> {
                const e = document.getElementById("genius_modal_1");
                if(e) { 
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
                  (e as any)?.showModal();
                }
              }}
            >
              <GeniusLogo />
              Find Lyrics 
            </Button>
            <Button
              className="btn bg-[#ff63a5] hover:bg-[#ff76b8] mr-3 w-[100%] mb-10 text-black active:scale-75 transition-all" 
              onClick={async () => { 
                setCurrentText(cleanText(currentText, false, false, false));  
                await processText(cleanText(currentText, false, false, false)); 
                toast({  
                  title: "Text Processed",
                  description: "Text Processed Successfully",
                  variant: "default",
                });
              }}
            >
              <WashingMachineIcon size={24} color="black" style={{marginRight: "5"}} />
              { "Process Text"}
            </Button>
            <Button 
              className="btn bg-[#ff6363] hover:bg-[#ff7676] mr-3 w-[100%] mb-10 text-white active:scale-75 transition-all" 
              onClick={async () => {
                toast({  
                  description: "Progress Cleared",
                  title: "Cleared",
                  variant: "destructive",
                }); 
                store.clearParagraphs();
              }}
            >
              <XCircleIcon size={24} color="white" style={{marginRight: "5"}} />
            Clear Progress
            </Button>
            <Button className="btn bg-[#63ff63] hover:bg-[#76ff76] mr-3 w-[100%] mb-10 text-black active:scale-75 transition-all"
              onClick={async () => {
                store.saveParagraphs(currentText);
                toast({  
                  title: "Saved",
                  description: "Progress Saved Successfully!",
                  variant: "default",
                });
              }}
            >
              <SaveAllIcon size={24} color="black" style={{marginRight: "5"}} />
            Save Progress
            </Button>
          </motion.div>  
          <div className="w-full h-96 flex flex-row mb-5">
            <div style={{ 
              width: "100%",  
              borderRadius: 10,  
              display: "flex",
              flexDirection: "column",  
            }}> 
              <RecommendText
                rhymingWords={rhymingWords}
                cleanText={cleanText}
                currentText={currentText}
                setCurrentText={setCurrentText}
                processText={processText}
                showAllRhyming={showAllRhyming}
                setShowAllRhyming={setShowAllRhyming}
              />
            </div>
            <div style={{ 
              width: "70%",  
              borderRadius: 10,  
              display: "flex",  
              justifyContent: "space-evenly",
            }}>       
              <MetricsParagraphs 
                phonoticsCount={phonoticsCount}
                uniqueWords={uniqueWords}
              />
            </div>
          </div>
        </div>
        <SearchSongModal setCurrentText={async (text: string) => {
          setCurrentText(cleanText(text, false, false, false));  
          await processText(cleanText(text, false, false, false));
        }} />

      </main>
    </>
  );
}

 