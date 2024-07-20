import { z } from "zod";  
import {
  createTRPCRouter, 
  publicProcedure,
} from "~/server/api/trpc";
import { type GeniusHit } from "~/schema";
import { api } from "~/utils/api";

const geniusBaseUrl = "https://api.genius.com";

const generateAccessToken = async () => {
  const redirect_uri = "https://www.wordsbyaesop.com/"; 
  const query = `https://api.genius.com/oauth/authorize?client_id=${process.env.GENIUS_CLIENT_ID}&redirect_uri=${redirect_uri}&scope=me&state=1&response_type=code`;
  console.log(query);
  try {
    const res = await fetch(query);
    const data = await res.json() as { access_token: string };
    console.log(res);
    return data.access_token;
  } catch (error) {
    console.error(error);
    return "";
  }
}; 

export const geniusRouter = createTRPCRouter({
  searchSong: publicProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => { 
      const access_token = process.env.GENIUS_TOKEN;
      try {
        const url = `${geniusBaseUrl}/search?q=${input.text}`;
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${access_token}`,
          },
        });
        const data = (await response.json()) as {
            meta: Record<string, unknown>,
            response: {
                hits: GeniusHit[]
            }
        }; 
        const namesWithIds = data.response.hits.map((hit) => {
          return {
            id: hit.result.id,
            name: hit.result.full_title,
            api_path: hit.result.api_path,
          };
        });
        return {
          songs: namesWithIds,    
        };
      } catch (error) {
        console.error(error);
        return {};
      } 
    }), 
});
