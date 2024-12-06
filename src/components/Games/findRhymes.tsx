/* eslint-disable @typescript-eslint/no-unsafe-assignment */ 

import { useState, useEffect, useRef } from "react";
import { Button } from "..//ui/button";
import { Input } from "..//ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getRandomWord, checkIfColorIsDark, generateColorFromString, scoreChosenWord } from "~/utils/phonomes";
import { dictionary } from "cmu-pronouncing-dictionary";  
import { ToggleGroup, ToggleGroupItem, } from "../ui/toggle-group";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircleIcon } from "lucide-react";

interface TypingGameProps {
  startCelebration: () => void;
}

export const TypingGame: React.FC<TypingGameProps> = ({
  startCelebration
}) => {
  const [wordsUsed, setWordsUsed] = useState<Record<string, boolean>>({});
  const [text, setText] = useState(getRandomWord(dictionary, wordsUsed));
  const [historyOfWords, setHistoryOfWords] = useState<{
    word: string;
    phonemes: string;
    userWord: string;
    userPhonemes: string;
  }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [userInputPhonemes, setUserInputPhonemes] = useState(""); 
  const [accuracy, setAccuracy] = useState(0);
  const [startGame, setStartGame] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null); 
  const [countDown, setCountDown] = useState(60);

  useEffect(() => {
    if (countDown === 0 && startGame && !gameEnded) { 
      setCountDown(60);
      setGameEnded(true);
      startCelebration();
    }
    if (countDown > 0 && startGame && !gameEnded) {
      setTimeout(() => {
        setCountDown(countDown - 1);
      }, 1000);
    }
  }, [countDown, startGame, gameEnded]);

  const resetGame = () => {
    setText(getRandomWord(dictionary, {}));
    setUserInput("");
    setUserInputPhonemes(""); 
    setGameEnded(false);
    setStartGame(false);
    setHistoryOfWords([]);
    setAccuracy(0);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  
  const gameHelper = driver({ 
    showProgress: true,
    steps: [
      { popover: { title: "Hello There!", description: "This rhyme game is inspired by the rapper Aesop Rock and uses the CMU Pronouncing Dictionary.", side: "right", align: "start" }},
      { element: "#text-time", popover: { title: "Select time", description: "Select duration of the game.", side: "right", align: "start" }}, 
      { element: "#text-word-given", popover: { title: "Words to rhyme against", description: "Here, the words that you need to rhyme with will be shown.", side: "right", align: "start" }}, 
      { element: "#text-input", popover: { title: "Start Game", description: "To start the game just start typing here!", side: "right", align: "start" }}, 
      { element: "#text-output-phonome", popover: { title: "Finding words that rhyme", description: "As you type, we will check for the phonomes of the words and display them here.", side: "right", align: "start" }}, 
      { element: "#text-input", popover: { title: "Next Word", description: "Once you are done typing click 'enter' on your keyboard and it will automatically select the next word!", side: "right", align: "start" }}, 
      { element: "#text-history", popover: { title: "History", description: "As you guess more words we will track all your previous words and score them.", side: "right", align: "start" }}, 
      { element: "#text-score", popover: { title: "History", description: "Once you are done we add up your score! Share it and see if you can beat your own score! :)", side: "right", align: "start" }}, 
      { popover: { title: "That's it!", description: "This where the fun begins! :)", side: "right", align: "start" }},
    ]  
  });

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row justify-center">
        <CardTitle className="text-xl sm:text-2xl font-bold text-center mr-2"> Find Rhymes </CardTitle> <HelpCircleIcon className="cursor-pointer" onClick={() => gameHelper.drive()} />
      </CardHeader> 
      <CardContent className="space-y-4" id="text-time">
        <ToggleGroup type="single">
          <ToggleGroupItem value="10" aria-label="Toggle bold" onClick={() => {
            setCountDown(10);
          }}>
            10 seconds
          </ToggleGroupItem>
          <ToggleGroupItem value="30" aria-label="Toggle italic" onClick={() => {
            setCountDown(30);
          }}>
            30 seconds
          </ToggleGroupItem>
          <ToggleGroupItem value="60" autoFocus aria-label="Toggle strikethrough" onClick={() => {
            setCountDown(60);
          }}>
            60 seconds
          </ToggleGroupItem>
        </ToggleGroup>
      </CardContent>
      <CardContent className="space-y-4">
        <div className="text-sm sm:text-lg font-medium bg-muted p-2 sm:p-4 rounded-md overflow-x-auto whitespace-nowrap" id="text-word-given">
          {text?.word?.split("").map((char, index) => (
            <span
              key={index} 
            >
              {char} 
            </span>
          ))}
          { " ---- "} 
          {text?.phonemes.split(" ").map((phoneme, index) => {    
            const backgroundColorUsingPhoneme = generateColorFromString(phoneme);
            const textColor = checkIfColorIsDark(backgroundColorUsingPhoneme);
            return <span key={index} style={{
              backgroundColor:   backgroundColorUsingPhoneme, 
              color: textColor, 
            }}> <u>{phoneme}</u> </span>; 
          })} 
        </div>
        <Input
          ref={inputRef}
          type="text"
          id="text-input"
          disabled={gameEnded}
          value={userInput}
          onChange={(e) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if(!startGame) {
              setStartGame(true);
            }
            let val = e.target.value; 
            val = val.replace(/[^a-zA-Z]/g, "").toLowerCase();
            setUserInput(val);
            setUserInputPhonemes(dictionary[val] ?? "");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if(userInput === "") {
                setText(getRandomWord(dictionary, wordsUsed));
                return;
              }
              const isWordInDictionary = dictionary[userInput];
              if(!isWordInDictionary) {
                alert("Word not found in dictionary! Try again!");
                return; 
              } 
              const scoreWord = scoreChosenWord(userInput, text.word, dictionary);
              setAccuracy(accuracy + scoreWord.score); 
              const newUserWordsUsed = { ...wordsUsed, [text.word]: true };
              setWordsUsed(newUserWordsUsed);
              setText(getRandomWord(dictionary, newUserWordsUsed));
              setUserInput("");
              setUserInputPhonemes("");
              setHistoryOfWords([
                ...historyOfWords,
                {
                  word: text.word,
                  phonemes: text.phonemes,
                  userWord: userInput,
                  userPhonemes: userInputPhonemes,
                },
              ]);
            }
          }}
          placeholder="Start typing here..."
          className="text-sm sm:text-lg"
          autoFocus
        />
        <div className="text-xs sm:text-sm" id="text-output-phonome">
          {userInputPhonemes.split(" ").map((phoneme, index) => { 
            const backgroundColorUsingPhoneme = generateColorFromString(phoneme);
            const textColor = checkIfColorIsDark(backgroundColorUsingPhoneme);
            return <span key={index} style={{
              backgroundColor:  backgroundColorUsingPhoneme, 
              color: textColor, 
            }}> {phoneme} </span>;
          })}
        </div>
      </CardContent>
      <CardContent className="flex flex-col sm:flex-row lg:flex-row justify-between lg:items-center sm:items-start space-y-2 lg:space-y-0">
        <div className="text-xs sm:text-sm">
          Time: {countDown} seconds
        </div>
        <div className="text-xs sm:text-sm" id="text-score">Score: {accuracy} <br /> Total Words: {historyOfWords.length} </div>
        <Button onClick={resetGame} className="w-full sm:w-auto">Reset</Button>
      </CardContent>

      <CardContent className="space-y-4" id="text-history">
        <div className="text-sm sm:text-lg font-medium bg-muted p-2 sm:p-4 rounded-md overflow-x-auto whitespace-nowrap"> Previous: </div>  
        {
          historyOfWords.sort((a, b) => {
            return scoreChosenWord(b.userWord, b.word, dictionary).score - scoreChosenWord(a.userWord, a.word, dictionary).score;
          }).map((history, index) => {
            const scoreForWord = scoreChosenWord(history.userWord, history.word, dictionary);
            return <>
              <div key={index} className="flex flex-col sm:flex-row justify-between lg:items-center sm:items-start space-y-2 sm:space-y-0">
                <div className="text-xs sm:text-sm">
                  <span className="font-bold">Word:</span> {history.word} <br />
                  <span className="font-bold">Phonemes:</span> {history.phonemes.split(" ").map((phoneme, index) => {
                    const backgroundColorUsingPhoneme = generateColorFromString(phoneme);
                    const textColor = checkIfColorIsDark(backgroundColorUsingPhoneme);
                    const isMatchingPhoneme = history.userPhonemes.split(" ").includes(phoneme);
                    return <span key={index} style={{
                      backgroundColor: isMatchingPhoneme ? backgroundColorUsingPhoneme : "", 
                      color:isMatchingPhoneme ? textColor : "black", 
                    }}> {phoneme} </span>;
                  })}
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="font-bold">User Word:</span> {history.userWord} <br />
                  <span className="font-bold">User Phonemes:</span> {history.userPhonemes.split(" ").map((phoneme, index) => {
                    const backgroundColorUsingPhoneme = generateColorFromString(phoneme);  
                    const isMatchingPhoneme = history.phonemes.split(" ").includes(phoneme);
                    const textColor = checkIfColorIsDark(backgroundColorUsingPhoneme);
                    return <span key={index} style={{
                      backgroundColor: isMatchingPhoneme ? backgroundColorUsingPhoneme : "", 
                      color: isMatchingPhoneme ?  textColor : "black", 
                    }}> {phoneme} </span>;
                  })}
                </div>
                <div className="text-xs sm:text-sm" style={{ 
                  padding: 5,
                  borderRadius: "10px",
                  fontWeight: "bold",
                }}>Score: {scoreForWord.score}</div>
              </div>
              <hr className="w-full" />
            </>;
          })
        }
      </CardContent>
    </Card>
  );
};

