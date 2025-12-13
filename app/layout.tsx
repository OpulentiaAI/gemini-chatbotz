import type { Metadata } from "next";
import { Geist_Mono, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";

import { Navbar } from "@/components/custom/navbar";
import { ThemeProvider } from "@/components/custom/theme-provider";
import { ConvexClientProvider } from "@/components/custom/convex-provider";
import { ArtifactProvider } from "@/hooks/use-artifact";
import { ArtifactPanel } from "@/components/custom/artifact-panel";

import "./globals.css";

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL("https://gemini.vercel.ai"),
  title: "Milica",
  description: "chatbot.",
  openGraph: {
    title: "Milica",
    description: "chatbot.",
    url: "/",
    siteName: "Milica",
    images: [
      {
        url: "/Gemini_Generated_Image_u9ivaau9ivaau9iv.png",
        width: 1200,
        height: 630,
        alt: "Milica chatbot",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Milica",
    description: "chatbot.",
    images: ["/Gemini_Generated_Image_u9ivaau9ivaau9iv.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jetbrainsMono.variable} ${geistMono.variable}`}>
      <body className="antialiased font-sans">
        <ConvexClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ArtifactProvider>
              <Toaster position="top-center" />
              <Navbar />
              {children}
              <ArtifactPanel />
            </ArtifactProvider>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
