"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

type Status = "ending" | "done" | "error";

export default function EndRoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = String(params?.roomId || "").toLowerCase();

  const [status, setStatus] = useState<Status>("ending");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let creatorKey = "";
    try {
      creatorKey = localStorage.getItem(`leetrun:fun-creator:${roomId}`) || "";
    } catch {
      /* ignore */
    }

    (async () => {
      try {
        const res = await fetch("/api/fun-room/dissolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, creatorKey }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          try {
            localStorage.removeItem(`leetrun:fun-creator:${roomId}`);
          } catch {
            /* ignore */
          }
          setStatus("done");
          setMessage("Everyone has been disconnected and the room is closed.");
        } else {
          setStatus("error");
          setMessage(data.error || "Couldn't end this room.");
        }
      } catch {
        setStatus("error");
        setMessage("Couldn't reach the server. Try again.");
      }
    })();
  }, [roomId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 text-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white/10 backdrop-blur border border-white/20 p-7 shadow-2xl text-center">
        <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 mb-4">
          {status === "ending" && (
            <Loader2 className="w-7 h-7 animate-spin" />
          )}
          {status === "done" && (
            <CheckCircle2 className="w-7 h-7 text-emerald-300" />
          )}
          {status === "error" && (
            <AlertCircle className="w-7 h-7 text-amber-200" />
          )}
        </div>

        <h1 className="text-2xl font-black">
          {status === "ending" && "Ending the room…"}
          {status === "done" && "Room ended"}
          {status === "error" && "Couldn't end the room"}
        </h1>
        <p className="mt-1 text-white/80 text-sm">
          Room <span className="font-mono font-bold">{roomId}</span>
        </p>
        {message && <p className="mt-4 text-sm text-white/90">{message}</p>}

        <div className="mt-7 flex flex-col gap-2">
          {status === "error" && (
            <button
              onClick={() => router.push(`/fun-room/${roomId}`)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-violet-700 font-black px-6 py-3 transition hover:scale-[1.01] active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              Open the room instead
            </button>
          )}
          <button
            onClick={() => router.push("/fun-room")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm px-6 py-2.5 transition"
          >
            Back to rooms
          </button>
        </div>
      </div>
    </div>
  );
}
