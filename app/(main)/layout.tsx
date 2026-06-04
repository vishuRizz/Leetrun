import React, { Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { FounderGiftModal } from "@/components/FounderGiftModal";
import GuestProvider from "@/components/GuestProvider";
import CommandPalette from "@/components/CommandPalette";
import { getSheetSummaries } from "@/lib/sheets";

// Minimal placeholder shown while the real Sidebar (which reads
// useSearchParams to highlight the active lobby) is being hydrated.
// Matches the collapsed sidebar's width so the page never jumps.
function SidebarFallback() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 z-50 w-16 bg-card border-r border-border" />
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sheets = getSheetSummaries().map((s) => ({
    slug: s.slug,
    name: s.name,
  }));
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <CommandPalette sheets={sheets} />
      <Suspense fallback={<SidebarFallback />}>
        <Sidebar />
      </Suspense>
      {/*
        The sidebar is fixed and w-16 when collapsed. We add pl-16 to the
        main wrapper so content isn't hidden behind the collapsed sidebar.
        When hovered, the sidebar expands but overlays content without
        pushing it.
      */}
      <div className="flex-1 pl-16 min-w-0">
        <GuestProvider>{children}</GuestProvider>
      </div>
      {/* Renders only for users still eligible for the gift; otherwise null. */}
      <FounderGiftModal />
    </div>
  );
}
