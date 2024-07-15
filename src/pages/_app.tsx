import { GeistSans } from "geist/font/sans";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app"; 
import { Analytics } from "@vercel/analytics/react";
import { api } from "~/utils/api";

import "~/styles/globals.css";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <main data-theme="sunset" className={GeistSans.className}>
        <Component {...pageProps} />
        <Analytics />
      </main>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
