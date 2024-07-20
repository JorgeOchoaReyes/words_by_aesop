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