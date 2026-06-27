import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store";
import { useToast } from "@/components/Toast";
import { notifTitle } from "./notificationText";
import { RealtimeClient, type RealtimeEvent } from "./ws";
import { api } from "./api";

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Create a pleasant "ding" sound
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // Drop to A4
    
    // Envelope for a quick strike and fade out
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (err) {
    // Ignore browser autoplay policy errors silently
    console.debug("Notification sound blocked by browser:", err);
  }
};

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAppStore((s) => s.accessToken);
  const tenantId = useAppStore((s) => s.tenantId);
  const qc = useQueryClient();
  const { info } = useToast();
  const clientRef = useRef<RealtimeClient | null>(null);

  useEffect(() => {
    if (!accessToken || !tenantId) return;
    const client = new RealtimeClient(accessToken, tenantId);
    clientRef.current = client;

    const off = client.on((e: RealtimeEvent) => {
      switch (e.type) {
        case "notification":
          qc.invalidateQueries({ queryKey: ["notifications", "unread"] });
          qc.invalidateQueries({ queryKey: ["notifications"] });
          info(notifTitle(e.payload));
          if (useAppStore.getState().notificationSound) {
            playNotificationSound();
          }
          break;
        case "ticket.created":
        case "ticket.updated":
        case "ticket.reply":
          qc.invalidateQueries({ queryKey: ["tickets"] });
          qc.invalidateQueries({ queryKey: ["ticket", e.payload.ticketId] });
          break;
        case "ticket.assigned":
          qc.invalidateQueries({ queryKey: ["tickets"] });
          qc.invalidateQueries({ queryKey: ["ticket", e.payload.ticketId] });
          break;
        case "task.assigned":
          qc.invalidateQueries({ queryKey: ["tasks"] });
          qc.invalidateQueries({ queryKey: ["task", e.payload.taskId] });
          break;
        case "sla.violation":
          qc.invalidateQueries({ queryKey: ["slas"] });
          qc.invalidateQueries({ queryKey: ["tickets"] });
          break;
        case "comment.mention":
          qc.invalidateQueries({ queryKey: ["notifications", "unread"] });
          if (e.payload.entityType === "ticket") {
            qc.invalidateQueries({ queryKey: ["ticket", e.payload.entityId] });
          } else {
            qc.invalidateQueries({ queryKey: ["task", e.payload.entityId] });
          }
          break;
        case "chat.message":
          qc.invalidateQueries({ queryKey: ["conversations"] });
          qc.invalidateQueries({ queryKey: ["messages", e.payload.conversationId] });
          break;
        case "presence":
          useAppStore.getState().applyPresence(e.payload.userId, {
            online: e.payload.online ?? true,
            availability: e.payload.availability,
          });
          break;
      }
    });

    // Seed the presence map once on connect (online set + everyone's availability).
    (async () => {
      try {
        const res = await api.users.presence.$get();
        if (!res.ok) return;
        const body = (await res.json()) as any;
        const d = body?.data;
        if (d) useAppStore.getState().seedPresence(d.online ?? [], d.availability ?? {});
      } catch {
        /* presence is best-effort */
      }
    })();

    client.connect();

    return () => {
      off();
      client.close();
      clientRef.current = null;
    };
  }, [accessToken, tenantId, qc, info]);

  return <>{children}</>;
}
