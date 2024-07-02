import { z } from "zod";
import { dictionary } from "cmu-pronouncing-dictionary";

import {
  createTRPCRouter, 
  publicProcedure,
} from "~/server/api/trpc";


export const rhymesRouter = createTRPCRouter({
  findPhonemes: publicProcedure
    .input(z.object({ text: z.string() }))
    .mutation(({ input }) => { 
      const allPhonemes = {} as Record<string, string>;
      for(const word of input.text.trim().split(" ")) {
        const phonemes = dictionary[word.toLowerCase()];
        if (!phonemes) {
          console.log(`No phonemes found for word: ${word}`);
          allPhonemes[word] = "";
          continue;
        } 
        allPhonemes[word] = (phonemes.replaceAll(/\d/g, "").replaceAll(/\s/g, " "));
      }  
      return {
        words: allPhonemes,
      };
    }), 
});
