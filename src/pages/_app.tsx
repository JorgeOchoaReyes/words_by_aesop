import { GeistSans } from "geist/font/sans";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app"; 
import { Analytics } from "@vercel/analytics/react";
import { api } from "~/utils/api"; 
import posthog from "posthog-js";
import React from "react";
import { Toaster } from "~/components/ui/toaster";


import "~/styles/globals.css";
import { Footer } from "~/components/Footer/Footer"; 

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  if (typeof window !== "undefined") { // checks that we are client-side
    posthog.init((process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ""), {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
      loaded: (posthog) => {
        if (process.env.NODE_ENV === "development") posthog.debug(); // debug mode in development
      },
    });
  }
  return (
    <>  
      <SessionProvider session={session}>
        <main data-theme="sunset" className={GeistSans.className}> 
          <Component {...pageProps} />
          <Footer />
          <Analytics />
          <Toaster />
        </main>
      </SessionProvider>
    </>
  );
};

export default api.withTRPC(MyApp);
