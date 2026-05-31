"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle2, Loader2, Share2 } from "lucide-react";

export function InviteFriendModal() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/social/invite-external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setEmail("");
        }, 2500);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send invite");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-primary/20 bg-background hover:bg-primary/10 text-primary h-10 px-4 py-2">
        <Share2 className="w-4 h-4" /> Invite Friend
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> Invite to CodeRun
          </DialogTitle>
          <DialogDescription>
            Enter your friend's email address below to send them an invitation to join the platform.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-in zoom-in" />
            <div>
              <p className="font-bold text-lg">Invite Sent!</p>
              <p className="text-sm text-muted-foreground">They should receive an email shortly.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Friend's Email Address</label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>
            
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !email}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Invite
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
