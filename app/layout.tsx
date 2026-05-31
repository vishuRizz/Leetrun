import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FloatingChatWidget } from "@/components/FloatingChatWidget";

// Body / UI font — neutral, highly legible, great for dense product UIs.
// Loaded as a variable font (full 100–900 axis) so every Tailwind weight class
// renders without the browser having to synthetically bold/italicize.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Optional display font — opt-in via the `font-heading` Tailwind class.
// Not auto-applied to h1–h4 because Space Grotesk maxes out at weight 700,
// and we use `font-black` (900) headings throughout the app.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

// Monospace — for numerics, code, and badges.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LeetRun – Algorithms & Data Structures",
  description: "LeetRun – Your gamified DSA preparation platform. Practice algorithms, compete with friends, and ace your placement interviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full antialiased ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans transition-colors duration-150">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <FloatingChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
