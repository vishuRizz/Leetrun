import React from "react";
import { Sidebar } from "@/components/Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      {/* 
        The sidebar is fixed and w-16 when collapsed.
        We add pl-16 to the main wrapper so content isn't hidden behind the collapsed sidebar.
        When hovered, the sidebar expands (w-64) but overlays the content without pushing it.
      */}
      <div className="flex-1 pl-16 min-w-0">
        {children}
      </div>
    </div>
  );
}
