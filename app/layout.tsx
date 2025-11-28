import { Metadata } from "next";
import { Toaster } from "sonner";

import { Navbar } from "@/components/custom/navbar";
import { ThemeProvider } from "@/components/custom/theme-provider";
import { ConvexClientProvider } from "@/components/custom/convex-provider";
import { ArtifactProvider } from "@/hooks/use-artifact";
import { ArtifactPanel } from "@/components/custom/artifact-panel";

import "./globals.css";
import "./monument-grotesk.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gemini.vercel.ai"),
  title: "Milica",
  description: "chatbot.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-monument">
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
