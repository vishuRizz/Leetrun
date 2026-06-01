import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { FounderGiftModal } from "@/components/FounderGiftModal";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      {/*
        The sidebar is fixed and w-16 when collapsed. We add pl-16 to the
        main wrapper so content isn't hidden behind the collapsed sidebar.
        When hovered, the sidebar expands but overlays content without
        pushing it.
      */}
      <div className="flex-1 pl-16 min-w-0">
        {children}
      </div>
      {/* Renders only for users still eligible for the gift; otherwise null. */}
      <FounderGiftModal />
    </div>
  );
}
