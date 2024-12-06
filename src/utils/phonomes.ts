import _ from "underscore";

export const processPhonemes = (text: string, dictionary: Record<string, string>): {
    words: Record<string, string>;
} => {
  const allPhonemes = {} as Record<string, string>;
  for(const word of text.trim().split(" ").join("\n").split("\n")) {
    const cleanWord = word.replaceAll(/[^0-9A-Za-z']/g, "").toLowerCase();
    const phonemes = dictionary[cleanWord];
    if (!phonemes) {
      // console.log(`No phonemes found for word: ${cleanWord}`);
      allPhonemes[cleanWord] = "";
      continue;
    } 
    allPhonemes[cleanWord] = (phonemes);
  }  
  // console.log("allPhonemes", allPhonemes);
  return {
    words: allPhonemes,
  };
};

export const findWordsThatRhyme = (word: string, dictionary: Record<string, string>): {
  highlyRhyming: string[];
  rhyming: string[];
  somewhatRhyming: string[];
} => {
  const wordPhonemes = dictionary[word];
  const splitPhonemes = wordPhonemes?.split(" ");

  if(splitPhonemes?.length === 0) {
    console.log(`No phonemes found for word: ${word}`);
    return {
      highlyRhyming: [],
      rhyming: [],
      somewhatRhyming: [],
    };
  };

  const highlyRhyming = [] as string[]; // 3 phonemes same
  const rhyming = [] as string[]; // 2 phonemes same
  const somewhatRhyming = [] as string[]; // 1 phonemes same

  if (!wordPhonemes) {
    console.log(`No phonemes found for word: ${word}`);
    return {
      highlyRhyming,
      rhyming,
      somewhatRhyming,
    };
  } 
  for(const dictWord of Object.keys(dictionary)) {
    if(dictWord === word) {
      continue;
    }
    const dictWordPhonemes = dictionary[dictWord];
    if (!dictWordPhonemes) {
      continue;
    }
    
    const splitDictWordPhonemes = dictWordPhonemes.split(" ");

    if(splitDictWordPhonemes.length === 0) return {
      highlyRhyming,
      rhyming,
      somewhatRhyming,
    };
    
    let matchingPhonemes = 0;
    for(let i = 0; i < splitPhonemes!.length; i++) {
      if(splitPhonemes?.[i] === splitDictWordPhonemes[i]) {
        matchingPhonemes++;
      }
    }

    const maxLengthHIghlyRhyming = 10;
    const maxLengthRhyming = 15;
    const maxLengthSomewhatRhyming = 20;
    if(matchingPhonemes === 4 && highlyRhyming.length < maxLengthHIghlyRhyming
    ) {
      highlyRhyming.push(dictWord);
    }
    else if(matchingPhonemes === 3 && rhyming.length < maxLengthRhyming
    ) {
      rhyming.push(dictWord);
    }
    else if(matchingPhonemes === 2 && somewhatRhyming.length < maxLengthSomewhatRhyming
    ) {
      somewhatRhyming.push(dictWord);
    } 
  }
  return {
    highlyRhyming,
    rhyming,
    somewhatRhyming,
  };
};

export const syllableCount = (phones: string): number => {
  const countSyllables = function (word: string) {
    return (word.match(/[012]/g) ?? []).length;
  };
  const syllableCount = countSyllables(phones);
  return syllableCount;
};

export const cleanText = (text: string, skipLines=true, skipSpecialChars=true, skipDoubleSpaes=true): string => {
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

export const checkIfColorIsDark = (hex: string): string => {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16); 
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b; 
  return luminance > 128 ? "#000000" : "#FFFFFF";   
};  

export const countOfPhonotics = (phonotics: Record<string, string>, text: string): Record<string, number> => {
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

export const uniqueWordsCount = (text: string): Record<string, number> => {  
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

export const getRandomWord = (dictionary: Record<string, string>, useWords: Record<string, boolean>): {
  word: string;
  phonemes: string;
} => {
  const randomWord = _.sample(Object.keys(dictionary));
  if (!randomWord) {
    throw new Error("No random word found");
  }
  if (useWords[randomWord]) {
    return getRandomWord(dictionary, useWords);
  } 
  const cleanWordFromSpecialChars = randomWord.replace(/[^0-9A-Za-z']/g, "").toLowerCase();
  return {
    word: cleanWordFromSpecialChars,
    phonemes: dictionary[randomWord] ?? "",
  };
};

export const scoreChosenWord = (chosenWord: string, targetWord: string, dictionary: Record<string, string>): {score: number, level: number} => { 
  let score = 0;
  let level = 0; 
  const chosenWordPhonemes = dictionary[chosenWord];
  const targetWordPhonemes = dictionary[targetWord];
  if (!chosenWordPhonemes || !targetWordPhonemes) { 
    return {
      score: 0,
      level: 0,
    };
  }
  const chosenWordPhonemesArray = chosenWordPhonemes.split(" ");
  const targetWordPhonemesArray = targetWordPhonemes.split(" ");
   
  for(const phoneme of chosenWordPhonemesArray) {
    if(targetWordPhonemesArray.includes(phoneme)) {
      score++;
    }
  } 
  if(score <= 0) {
    level = 0;
  } else if(score === 1) {
    level = 1;
  } else if(score === 2) {
    level = 2;
  } else if(score === 3) {
    level = 3;
  } else if(score === 4) {
    level = 4;   
  } else {
    level = 5;
  }

  return {
    score: score, 
    level: level
  }; 
};

const singleCharColors: Record<string, string> = {};

function generateDistinctColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.floor(Math.random() * 30); 
  const lightness = 35 + Math.floor(Math.random() * 30); 
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function generateColorFromString(str: string): string { 
  if (str.length === 1) {
    const char = str.toLowerCase();
    if (!singleCharColors[char]) {
      let newColor;
      do {
        newColor = generateDistinctColor();
      } while (Object.values(singleCharColors).includes(newColor));
      singleCharColors[char] = newColor;
    }
    return singleCharColors[char];
  }

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  const saturation = 70 + (hash % 30);  
  const lightness = 35 + (hash % 30);   
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function isColorDark(r: number, g: number, b: number): boolean {
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}

