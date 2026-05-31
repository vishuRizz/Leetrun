import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FloatingChatWidget } from "@/components/FloatingChatWidget";

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
    <html lang="en" suppressHydrationWarning className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-150">
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
