import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { getConfig } from "@/lib/wagmi";
import { NoScriptFallback } from "@/components/NoScriptFallback";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Ancile - Sacred Shield for Your Crypto",
  description: "The divine guardian of your digital assets. Natural language DeFi transactions with ultimate security.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Extract cookies from request headers for SSR hydration
  const headersList = await headers();
  const cookie = headersList.get("cookie");

  // Convert cookie to initial Wagmi state for hydration consistency
  const initialState = cookieToInitialState(getConfig(), cookie);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('ancile-theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                      document.documentElement.classList.add('dark');
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-background`}
      >
        {/* Fallback for JavaScript-disabled browsers */}
        <NoScriptFallback />
        
        <Providers initialState={initialState}>
          <main className="flex min-h-screen flex-col">{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
