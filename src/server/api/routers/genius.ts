import { z } from "zod";  
import {
  createTRPCRouter, 
  publicProcedure,
} from "~/server/api/trpc";
import { type GeniusSongReference, type GeniusHit } from "~/schema";
import { api } from "~/utils/api";
import {parse} from "node-html-parser"; 

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
        if(data.response.song.embed_content) {
          const url = data.response.song.embed_content.match(/src='([^"]+)'/);
          if(url) {
            const fetchUrl = url[1] ?? ""; 
            const cleanUrl = "https:" + fetchUrl;
            try {
              const res = await fetch(cleanUrl);  
              const embedContent = await res.text(); 
              const json = (embedContent?.split("JSON.parse(")?.[1]?.split("))"));  
              const html = parse(json?.[0] ?? ""); 
              const innerText = html.innerText;  
              const clean1 = innerText.replaceAll("\\n", "\n").replaceAll("\\", "").replaceAll("\"","") 
                .replace(/<\/?[a-z][\s\S]*?>/gi,"") 
                .split("\n");
              clean1.shift();
              clean1.pop();
              const cleanText = clean1.filter((line) => line.trim() !== "")
                .filter((line) => !line.includes("More on Genius"))
                .filter((line) => !line.includes("Embed"))
                .filter((line) => !line.includes("Lyrics"))
                .filter((line) => !line.includes("[Verse"))  
                .filter((line) => !line.includes("[Chorus"))
                .filter((line) => !line.includes("[Pre-Chorus"))
                .filter((line) => !line.includes("[Bridge"))
                .filter((line) => !line.includes("[Outro"))
                .filter((line) => !line.includes("[Intro"))
                .filter((line) => !line.includes("[Hook"))
                .filter((line) => !line.includes("Powered by Genius"))
                .filter((line) => !line.includes("Lyrics for this song have yet to be released. Please check back once the song has been released."))
                .filter((line) => !line.includes("[Produced by"))
                .filter((line) => !line.includes("[Part"))
                .filter((line) => !line.includes("[Refrain"))
                .filter((line) => !line.includes("[Instrumental"))
                .filter((line) => !line.includes("[Guitar"))
                .filter((line) => !line.includes("[Piano"))
                .filter((line) => !line.includes("[Post-Chorus"))
                .filter((line) => !line.includes("[Outro"))
                .filter((line) => !line.includes("[Video"))
                .join("\n");
              lyrics = cleanText; 
            } catch (error) {
              console.log(error);
            } 
          }         
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
