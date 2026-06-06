"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Video, ArrowRight, Sparkles, Link2, Loader2 } from "lucide-react";

export const creatorKeyStorageKey = (roomId: string) =>
  `leetrun:fun-creator:${roomId}`;

function newRoomId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const s = Array.from(bytes, (b) => (b % 36).toString(36)).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

// Accept a raw code or a pasted full link and pull out the room id.
function parseCode(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  const fromUrl = v.match(/\/fun-room\/([a-z0-9-]+)/i);
  const code = (fromUrl ? fromUrl[1] : v).toLowerCase();
  return /^[a-z0-9-]{4,64}$/.test(code) ? code : null;
}

export default function RoomLanding() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/fun-room/create", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.roomId) {
        // Stash the private owner key so this device can dissolve the room.
        try {
          if (data.creatorKey)
            localStorage.setItem(creatorKeyStorageKey(data.roomId), data.creatorKey);
        } catch {
          /* ignore */
        }
        router.push(`/fun-room/${data.roomId}`);
        return;
      }
    } catch {
      /* fall through to a keyless room */
    }
    // Fallback: still let them in (without owner controls) if the API failed.
    router.push(`/fun-room/${newRoomId()}`);
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseCode(code);
    if (!id) {
      setErr("Enter a valid room code or link.");
      return;
    }
    router.push(`/fun-room/${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 text-white flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Just for fun · no sign-up needed
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
          Spin up a video room in one tap.
        </h1>
        <p className="mt-4 text-white/80 text-base sm:text-lg">
          Create a room, share the link, and hang out. Video, voice and chat,
          no account required.
        </p>

        <button
          onClick={create}
          disabled={creating}
          className="mt-8 group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-violet-700 font-black text-lg px-7 py-4 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition disabled:opacity-70 disabled:hover:scale-100"
        >
          {creating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <Video className="w-5 h-5" />
              Create a room
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition" />
            </>
          )}
        </button>

        <div className="mt-10 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-5">
          <label className="text-sm font-bold flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4" />
            Have a code or link?
          </label>
          <form onSubmit={join} className="flex items-center gap-2">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setErr("");
              }}
              placeholder="e.g. k3f9-2xab or paste a link"
              className="flex-1 min-w-0 rounded-xl bg-white/90 text-zinc-900 placeholder:text-zinc-500 px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-white"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-zinc-900/80 hover:bg-zinc-900 text-white font-bold text-sm px-4 py-2.5 transition"
            >
              Join
            </button>
          </form>
          {err && <p className="mt-2 text-xs text-white font-medium">{err}</p>}
        </div>

        <p className="mt-8 text-xs text-white/60">
          Rooms are open to anyone with the link. Be nice. 💜
        </p>
      </div>
    </div>
  );
}
