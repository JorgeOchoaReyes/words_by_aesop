export const processPhonemes = (text: string, dictionary: Record<string, string>): {
    words: Record<string, string>;
} => {
  const allPhonemes = {} as Record<string, string>;
  for(const word of text.trim().split(" ")) {
    const phonemes = dictionary[word.toLowerCase()];
    if (!phonemes) {
      console.log(`No phonemes found for word: ${word}`);
      allPhonemes[word] = "";
      continue;
    } 
    allPhonemes[word] = (phonemes);
  }  
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
    if(matchingPhonemes === 4) {
      highlyRhyming.push(dictWord);
    }
    else if(matchingPhonemes === 3) {
      rhyming.push(dictWord);
    }
    else if(matchingPhonemes === 2) {
      somewhatRhyming.push(dictWord);
    } 
  }
  return {
    highlyRhyming,
    rhyming,
    somewhatRhyming,
  };
};