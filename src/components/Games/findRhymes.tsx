/* eslint-disable @typescript-eslint/no-unsafe-assignment */ 

import { useState, useEffect, useRef } from "react";
import { Button } from "..//ui/button";
import { Input } from "..//ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getRandomWord, checkIfColorIsDark, generateColorFromString, scoreChosenWord } from "~/utils/phonomes";
import { dictionary } from "cmu-pronouncing-dictionary";  
import { ToggleGroup, ToggleGroupItem, } from "../ui/toggle-group";

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

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl font-bold text-center"> Find Rhymes </CardTitle>
      </CardHeader> 
      <CardContent className="space-y-4">
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
        <div className="text-sm sm:text-lg font-medium bg-muted p-2 sm:p-4 rounded-md overflow-x-auto whitespace-nowrap">
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
        <div className="text-xs sm:text-sm">
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
        <div className="text-xs sm:text-sm">Score: {accuracy} <br /> Total Words: {historyOfWords.length} </div>
        <Button onClick={resetGame} className="w-full sm:w-auto">Reset</Button>
      </CardContent>

      <CardContent className="space-y-4">
        <div className="text-sm sm:text-lg font-medium bg-muted p-2 sm:p-4 rounded-md overflow-x-auto whitespace-nowrap"> Previous: </div>  
        {
          historyOfWords.sort((a, b) => {
            return scoreChosenWord(a.userWord, a.word, dictionary).score - scoreChosenWord(b.userWord, b.word, dictionary).score;
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

