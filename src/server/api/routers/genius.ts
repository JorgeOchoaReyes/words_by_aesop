import { z } from "zod";
import { dictionary } from "cmu-pronouncing-dictionary";

import {
  createTRPCRouter, 
  publicProcedure,
} from "~/server/api/trpc";

const geniusBaseUrl = "https://api.genius.com";

const generateAccessToken = async () => {
  const redirect_uri = "https://www.wordsbyaesop.com/"; 
  const query = `
    https://api.genius.com/oauth/authorize?
        client_id=${process.env.GENIUS_CLIENT_ID}&
        redirect_uri=${redirect_uri}&
        scope=me&
        state=1&
        response_type=code
    `;
  const res = await fetch(query);
  const data = await res.json() as { access_token: string };
  console.log(res);
  return data.access_token;
};


export const geniusRouter = createTRPCRouter({
  searchSong: publicProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => { 
      const access_token = await generateAccessToken();
      const url = `${geniusBaseUrl}/search?q=${input.text}`;
      const response = fetch(url, {
        headers: {
          "Authorization": `Bearer ${access_token}`,
        },
      });
    }), 
});
