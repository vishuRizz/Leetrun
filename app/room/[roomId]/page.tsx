"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

// LiveKit is client-only and heavy, so load the room shell lazily.
const FunRoom = dynamic(() => import("@/components/room/FunRoom"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 className="w-7 h-7 text-white animate-spin" />
    </div>
  ),
});

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = String(params?.roomId || "").toLowerCase();
  return <FunRoom roomId={roomId} />;
}
