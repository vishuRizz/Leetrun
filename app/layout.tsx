import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FloatingChatWidget } from "@/components/FloatingChatWidget";
import PostHogProvider from "@/components/analytics/PostHogProvider";
import { siteConfig } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.creator, url: siteConfig.url }],
  creator: siteConfig.creator,
  publisher: siteConfig.creator,
  category: "education",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} | Gamified DSA & LeetCode Placement Prep`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.shortDescription,
    images: [siteConfig.ogImage],
    creator: siteConfig.twitter,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

// Structured data (JSON-LD). Search engines and LLM crawlers (Google, Bing,
// ChatGPT/Perplexity) read this to understand what LeetRun is, surface it for
// brand queries, and render rich results / answer-engine citations.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      logo: `${siteConfig.url}/logo.png`,
      email: siteConfig.email,
      description: siteConfig.shortDescription,
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.shortDescription,
      publisher: { "@id": `${siteConfig.url}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "SoftwareApplication",
      name: siteConfig.name,
      operatingSystem: "Web",
      applicationCategory: "EducationalApplication",
      url: siteConfig.url,
      description: siteConfig.description,
      featureList: [
        "Curated DSA sheets: Blind 75, NeetCode 150, Striver's SDE & A2Z, Love Babbar 450",
        "Company-specific question banks (Google & Amazon Top 100)",
        "Interview patterns ranked by weightage with pattern-wise questions",
        "Deep LeetCode sync that imports your entire solve history",
        "Adaptive daily, weekly, and configurable revision quests",
        "Smart leaderboards ranked by XP, level, streak, solves, or contest rating",
        "Public shareable profiles with LeetCode analytics",
        "Real-time multiplayer coding rooms",
        "AI mentor that tracks weak topics and keeps you accountable",
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${siteConfig.url}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What exactly is LeetRun, and how does it work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "LeetRun is a gamified DSA placement platform built around curated sheets (Blind 75, NeetCode 150, Striver's SDE & A2Z, company sets), interview patterns ranked by weightage, and adaptive quests. It syncs with your LeetCode profile and an AI mentor keeps you accountable.",
          },
        },
        {
          "@type": "Question",
          name: "Which DSA sheets and question banks are included?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Blind 75, NeetCode 150, Striver's SDE Sheet, Striver's A2Z, Love Babbar 450, and company-specific sets like Google and Amazon Top 100. You can pin focus sheets and your progress is tracked automatically.",
          },
        },
        {
          "@type": "Question",
          name: "What is Deep LeetCode Sync?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Deep Sync imports your entire LeetCode solve history - every accepted problem, not just recent ones - and automatically checks them off across all of your sheets, also powering accurate quest verification.",
          },
        },
        {
          "@type": "Question",
          name: "Does LeetRun require a LeetCode Premium account?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. LeetRun works with any public LeetCode account. You connect your username during onboarding and LeetRun automatically syncs your stats, recent submissions, and solved counts.",
          },
        },
      ],
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <PostHogProvider>
            {children}
            <FloatingChatWidget />
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
