/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { motion } from "framer-motion";
import { ShareIcon } from "lucide-react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { useToast } from "~/hooks/use-toast";
import { AnimatedLoading } from "~/components/Loading/AnimatedLoading";
import { Checkbox } from "~/components/ui/checkbox";
import { uniqueWordsCount, countOfPhonotics, cleanText, checkIfColorIsDark } from "~/utils/phonomes";
import { GradientButton } from "~/components/Button/GradientButton";

export default function Home() {  
  const [currentText, setCurrentText] = React.useState<string>(""); 
  const [phonoticParagraph, setPhonoticParagraph] = React.useState<Record<string, string>>({});
  const [phonoticsCount, setPhonoticsCount] = React.useState<Record<string, number>>({});
  const [uniqueWords, setUniqueWords] = React.useState<Record<string, number>>({});
  const [phonoticsAsMatchingColors, setPhonoticsAsMatchingColors] = React.useState<Record<string, string>>({} as Record<string, string>); 
  const store = useStore();
  const storedParagraphs = useStore((state) => state.paragraphs); 
  const h2Ref = React.useRef<HTMLHeadingElement | null>(null);
  const [, setLoading] = React.useState(false);
  const [geniusModal, setGeniusModal] = React.useState(false);
  const [geniusSongId, setGeniusSongId] = React.useState("");
  const toast = useToast(); 
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

  const processText = (text: string) => {
    setLoading(true);
    const res = processPhonemes(text, dictionary); 
    if(res.words) {
      Object.keys(res.words).forEach((word) => {
        const newPhonotic = (res.words[word] ?? ""); 
        const splitPhonotic = newPhonotic.split(" "); 
        splitPhonotic.forEach((phonotic) => {
          if(!phonoticsAsMatchingColors[phonotic]) {   
            function getRandomHexColor() { 
              const randomChannel = () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
              return `#${randomChannel()}${randomChannel()}${randomChannel()}`;
            } 
            phonoticsAsMatchingColors[phonotic] = `${getRandomHexColor()}`;
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
    if(
      lastWord 
      && store.allowFindWordsThatRhyme
    ) {
      const rhymes = findWordsThatRhyme(lastWord, dictionary);
      setRhymingWords(rhymes); 
    }
    setLoading(false);
  };

  useEffect(() => {
    const paragraphs = storedParagraphs; 
    if(paragraphs && paragraphs.length > 0) {
      setCurrentText(paragraphs);
      processText(paragraphs); 
    }
  }, [storedParagraphs]); 

  const router = useRouter(); 
  const query = router.query;  
  const searchSong = api.geniusRouter.getSong.useMutation(); 

  useEffect(() => {
    void (async () => {
      if(query?.geniusId) {
        try {
          const res = await searchSong.mutateAsync({ api_path: "/songs/" + (query.geniusId as string) });
          if(res.song) {
            const songScript = res.song.lyrics;
            const songName = res.song.name; 
            store.setSongName(songName);
            setCurrentText(cleanText(songScript, false, false, false));
            processText(cleanText(songScript, false, false, false));
            store.saveParagraphs(cleanText(songScript, false, false, false));
            setGeniusSongId(query.geniusId as string);
          } else {
            toast.toast({
              title: "Error",
              description: "Failed to load song",
              variant: "destructive",
            });
          }
        } catch (error) { 
          toast.toast({
            title: "Error",
            description: "Failed to load song", 
            variant: "destructive",
          });
        } 
      }
    })();
  }, [query]);
  
  return (  
    <>
      <Head>
        <title>Words By Aesop</title>
        <meta name="description" content="Discover the ultimate text analysis tool! Our website offers precise word count, identifies unique words, provides pronunciation, and tracks vowel usage. Enhance your writing with our comprehensive text analysis!" />
        <meta name="keywords" content="text analysis, word count, unique words, pronunciation, vowel usage" />
        <meta name="author" content="Jorge Reyes" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        <meta property="og:title" content="Words By Aesop" />
        <meta property="og:description" content="Discover the ultimate text analysis tool! Our website offers precise word count, identifies unique words, provides pronunciation, and tracks vowel usage. Enhance your writing!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://wordsbyaesop.com" />
        <meta property="og:image" content="https://wordsbyaesop.com/og-image.png" />
        <meta property="og:site_name" content="Words By Aesop" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Words By Aesop" />
        <meta name="twitter:description" content="Discover the ultimate text analysis tool! Our website offers precise word count, identifies unique words, provides pronunciation, and tracks vowel usage. Enhance your writing with our comprehensive text analysis!" />
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
        <div className="flex w-full md:justify-around sm:justify-center mt-14 xs:flex-col md:flex-row">
          <h1 className="text-5xl font-bold flex md:justify-around xs:justify-center text-center items-center xs:flex-col md:flex-row">
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
          {
            searchSong.isPending ? 
              <AnimatedLoading />
              :
              <>
                <div className="flex md:justify-between xs:justify-center w-full xs:flex-col md:flex-row pl-3"> 
                  <h2 ref={h2Ref} className="md:text-2xl xs:text-xl mb-5 underline md:self-start"> 
                    Total Words: <b> {Object.values(uniqueWords).reduce((acc, curr) => acc + curr, 0)}</b> Unique Words: <b> {Object.keys(uniqueWords).length}</b> 
                    <br />    <br /> 
                    <span className="text-start"> {store.songName && <b> Song: {store.songName}</b>} </span>
                  </h2> 
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}  
                    className="flex flex-row w-fit xs:self-center md:self-end">
                    <Button className="btn bg-[#ffff63] hover:bg-[#ffff76] mr-3 w-[100%] mb-10 text-black active:scale-75 transition-all text-lg"
                      onClick={()=> {
                        setGeniusModal(true);
                      }}
                    >
                      <GeniusLogo />
                      Find Lyrics 
                    </Button>
                    {
                      geniusSongId && 
                      <Button className="btn bg-black hover:bg-grey mr-3 w-[100%] mb-10 text-white active:scale-75 transition-all text-lg"
                        onClick={()=> {
                          const geniusId = (process.env.NODE_ENV === "production" ? "https://www.wordsbyaesop.com?geniusId=" : "http://localhost:3000?geniusId=") + geniusSongId;
                          if(navigator.clipboard) {
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                            ((navigator?.clipboard as any))?.writeText(geniusId);
                            toast.toast({
                              title: "Copied",
                              description: "Link copied to clipboard", 
                            });
                          }
                        }}
                      > 
                        <ShareIcon size={24} className="mr-4" />
                        Share Lyrics 
                      </Button>
                    }
                  </motion.div>
                </div>
                <div className="flex md:w-[100%] xs:w-[100vw] justify-around xs:flex-col md:flex-row"> 
                  <AnimatedTextArea   
                    placeholder="Get creative here............"  
                    rows={13}
                    textValue={currentText}
                    setTextValue={async (e) => {   
                      if(e.endsWith(" ") || e.endsWith("\n")) {
                        setCurrentText(cleanText(e, false, false, false));  
                        processText(cleanText(e, false, false, false));
                        return;
                      }   
                      store.clearSongName();
                      store.saveParagraphs(cleanText(e, false, false, false));
                      setCurrentText(cleanText(e, false, false, false));  
                    }} 
                  />    
                  <div className="md:w-[50vw] sm:w-[100vw] flex-col justify-center items-center mb-10">
                    <ColorPraragraphs 
                      currentText={currentText}
                      phonoticParagraph={phonoticParagraph}
                      phonoticsCount={phonoticsCount}
                      phonoticsAsMatchingColors={phonoticsAsMatchingColors}
                      checkIfColorIsDark={checkIfColorIsDark}
                    />
                  </div>
                </div>   
                <div className="bg-white flex sm:self-center md:self-end">
                  <GradientButton text="Test your rhyming skills!" linkTo="/game" />
                </div> 
                <div className="w-full md:h-96 xs:w-full flex flex-row mb-5 mt-10 xs:flex-col md:flex-row">
                  <div 
                    className="xs:mb-10"
                    style={{ 
                      width: "100%",  
                      borderRadius: 10,  
                      display: "flex",
                      flexDirection: "column",  
                    }}>  
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={store.allowFindWordsThatRhyme}
                        onCheckedChange={() => {
                          store.setAllowFindWordsThatRhyme(!store.allowFindWordsThatRhyme);
                        }}
                        id="rhymes-checkbox"
                      />
                      <label
                        htmlFor="rhymes-checkbox"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Allow Find Words That Rhyme {"(Beta, may slow down performance)"}
                      </label>
                    </div>
                    {
                      store.allowFindWordsThatRhyme &&  
                      <RecommendText
                        rhymingWords={rhymingWords}
                        currentText={currentText}
                        showAllRhyming={showAllRhyming}
                        cleanText={cleanText}
                        setCurrentText={setCurrentText}
                        processText={processText}
                        setShowAllRhyming={setShowAllRhyming}
                      />
                    } 
                  </div>
                  <div 
                    className="xs:w-full md:w-[70%]"
                    style={{   
                      borderRadius: 10,  
                      display: "flex",  
                      justifyContent: "space-evenly",
                    }}
                  >       
                    <MetricsParagraphs 
                      phonoticsCount={phonoticsCount}
                      uniqueWords={uniqueWords}
                    />
                  </div>
                </div>
              </>
          } 
        </div>
        <SearchSongModal 
          setCurrentText={async (text: string, id: string, songName) => {
            setCurrentText(cleanText(text, false, false, false));  
            processText(cleanText(text, false, false, false)); 
            store.saveParagraphs(cleanText(text, false, false, false));
            store.setSongName(songName);
            setGeniusSongId(id);
          }}
          isOpen={geniusModal}
          toggleModal={() => setGeniusModal(!geniusModal)}
        /> 
      </main>
    </>
  );
}

 