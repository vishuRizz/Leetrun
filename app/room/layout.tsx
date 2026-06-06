import type { Metadata } from "next";

// Hidden, share-by-link only: keep these standalone video rooms out of every
// search index and crawler, even if a link gets shared publicly.
export const metadata: Metadata = {
  title: "Video Room",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
