import { z } from "zod";  
import {
  createTRPCRouter, 
  publicProcedure,
} from "~/server/api/trpc";
import { type GeniusSongReference, type GeniusHit } from "~/schema";  
const geniusBaseUrl = "https://api.genius.com";
const ovhApiUrl = "https://api.lyrics.ovh";

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
  searchSongs: publicProcedure
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
            id: hit.result.id || "",
            name: hit.result.full_title || "",
            api_path: hit.result.api_path || "",
            image: hit.result.song_art_image_url || "",
          } as GeniusSongReference;
        });
        return {
          songs: namesWithIds,    
        };
      } catch (error) {
        console.error(error);
        return {};
      } 
    }), 
  getSong: publicProcedure
    .input(z.object({ api_path: z.string() }))
    .mutation(async ({ input }) => {
      const access_token = process.env.GENIUS_TOKEN;
      try {
        const url = `${geniusBaseUrl}${input.api_path}`;
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${access_token}`,
          },
        }); 
        const data = (await response.json()) as {
            meta: Record<string, unknown>,
            response: {
                song: {
                    id: number,
                    full_title: string,
                    url: string,
                    title: string,
                    title_with_featured: string,
                    header_image_url: string,
                    primary_artist: {
                        name: string,
                        image_url: string,
                    },
                    embed_content: string,
                }
            }
        }; 
        let lyrics = "";
 
        if(lyrics === "" && data?.response?.song?.primary_artist?.name && data?.response?.song?.title) { 
          // console.log("artist: ", data?.response?.song?.primary_artist?.name);
          // console.log("title: ", data?.response?.song?.title); 
          try{
            const url = `${ovhApiUrl}/v1/${data?.response?.song.primary_artist.name}/${data?.response?.song.title}`;
            const response = await fetch(url);
            const res = await response.json() as { lyrics: string }; 
            // console.log(res);
            lyrics = res.lyrics ?? "Lyrics not found";
            lyrics = (res.lyrics || "").replaceAll("\n\n", "\n").replaceAll("\\", "").replaceAll("\"","");
          } catch (err) {
            console.log(err); 
            lyrics = "Lyrics not found"; 
          }
        } else {
          lyrics = "Lyrics not found";
        }
        return {
          song: {
            id: data.response.song.id,
            name: data.response.song.full_title,
            url: data.response.song.url,  
            lyrics: lyrics,
          },
        };
      } catch (error) {
        console.log(error);
        return {};
      }
    }),
});
