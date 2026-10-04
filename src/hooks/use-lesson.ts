"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ensureSession, errorMessage, getSupabase } from "@/lib/supabase/client";
import type {
  BroadcastEvent,
  BroadcastEvents,
  Lesson,
  LessonSummary,
  Message,
  MessageKind,
  MessageMeta,
  PresenceState,
  Role,
} from "@/lib/types";

const BROADCAST_EVENTS: BroadcastEvent[] = [
  "semafor",
  "caption_interim",
  "buzz",
  "teacher_alert",
  "teacher_alert_ack",
  "pending_sign",
  "pending_cancel",
  "summary_ready",
];

export type ConnectionState = "connecting" | "online" | "reconnecting";

type Handler<E extends BroadcastEvent> = (payload: BroadcastEvents[E]) => void;

export interface NewMessage {
  sender_role: "teacher" | "student";
  sender_name: string | null;
  text: string;
  kind: MessageKind;
  meta?: MessageMeta;
}

/**
 * Lecția în timp real: intrarea pe bază de cod (RPC join_lesson), mesajele persistente
 * (Postgres Changes), evenimentele efemere (Broadcast) și cine e conectat (Presence).
 */
export function useLesson(code: string, role: Role, displayName?: string) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [presence, setPresence] = useState<PresenceState[]>([]);
  const [ready, setReady] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const handlers = useRef(new Map<BroadcastEvent, Set<Handler<BroadcastEvent>>>());
  const joinHandlers = useRef(new Set<(p: PresenceState) => void>());
  const messageHandlers = useRef(new Set<(m: Message) => void>());
  const wasOnline = useRef(false);
  // Cheia Presence e per fereastră, nu per utilizator: același dispozitiv poate deschide
  // mai multe ecrane (de ex. profesorul + ecranul clasei pe același laptop).
  const [presenceKey] = useState(() => Math.random().toString(36).slice(2) + Date.now().toString(36));

  const addMessages = useCallback((incoming: Message[]) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }, []);

  const loadHistory = useCallback(
    async (lessonId: string) => {
      const supabase = getSupabase();
      const [{ data: msgs }, { data: sum }] = await Promise.all([
        supabase.from("messages").select("*").eq("lesson_id", lessonId).order("created_at").limit(500),
        supabase.from("lesson_summaries").select("*").eq("lesson_id", lessonId).maybeSingle(),
      ]);
      if (msgs) addMessages(msgs as Message[]);
      if (sum) setSummary(sum as LessonSummary);
    },
    [addMessages],
  );

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    const supabase = getSupabase();

    (async () => {
      try {
        const session = await ensureSession();
        if (cancelled) return;
        setUserId(session.user.id);

        const { data, error: rpcError } = await supabase.rpc("join_lesson", {
          p_code: code,
          p_role: role === "desk" ? "class" : role,
          p_display_name: displayName ?? null,
        });
        if (rpcError) throw rpcError;
        const joined = data as Lesson;
        if (cancelled) return;
        setLesson(joined);
        await loadHistory(joined.id);
        if (!cancelled) setReady(true);
        if (cancelled) return;

        channel = supabase.channel(`lesson:${joined.code}`, {
          config: { broadcast: { self: true, ack: false }, presence: { key: presenceKey } },
        });

        channel.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `lesson_id=eq.${joined.id}` },
          (payload) => {
            const m = payload.new as Message;
            addMessages([m]);
            messageHandlers.current.forEach((h) => h(m));
          },
        );
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "lesson_summaries", filter: `lesson_id=eq.${joined.id}` },
          (payload) => {
            if (payload.new && "lesson_id" in payload.new) setSummary(payload.new as LessonSummary);
          },
        );
        channel.on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "lessons", filter: `id=eq.${joined.id}` },
          (payload) => setLesson((prev) => (prev ? { ...prev, ...(payload.new as Lesson) } : prev)),
        );

        for (const event of BROADCAST_EVENTS) {
          channel.on("broadcast", { event }, ({ payload }) => {
            if (event === "summary_ready" && payload?.summary) setSummary(payload.summary as LessonSummary);
            handlers.current.get(event)?.forEach((h) => h(payload));
          });
        }

        channel.on("presence", { event: "sync" }, () => {
          const state = channel!.presenceState<PresenceState>();
          const list: PresenceState[] = [];
          for (const [key, metas] of Object.entries(state)) {
            if (key === presenceKey) continue;
            if (metas[0]) list.push(metas[0]);
          }
          setPresence(list);
        });
        channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
          if (key === presenceKey) return;
          for (const p of newPresences as unknown as PresenceState[]) joinHandlers.current.forEach((h) => h(p));
        });

        channel.subscribe(async (status) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") {
            setConnection("online");
            await channel!.track({
              role,
              name: displayName ?? (role === "student" ? joined.student_name : role === "teacher" ? "Profesor" : role === "desk" ? "Masa elevului" : "Clasa"),
              online_at: new Date().toISOString(),
            } satisfies PresenceState);
            // După o reconectare, recuperăm mesajele pierdute.
            if (wasOnline.current) loadHistory(joined.id);
            wasOnline.current = true;
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setConnection(wasOnline.current ? "reconnecting" : "connecting");
          }
        });
        channelRef.current = channel;
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      }
    })();

    const offline = () => setConnection("reconnecting");
    window.addEventListener("offline", offline);

    return () => {
      cancelled = true;
      window.removeEventListener("offline", offline);
      if (channel) supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [code, role, displayName, addMessages, loadHistory, presenceKey]);

  const on = useCallback(<E extends BroadcastEvent>(event: E, handler: Handler<E>) => {
    const map = handlers.current;
    if (!map.has(event)) map.set(event, new Set());
    const set = map.get(event)!;
    set.add(handler as Handler<BroadcastEvent>);
    return () => {
      set.delete(handler as Handler<BroadcastEvent>);
    };
  }, []);

  /** Mesaje noi sosite prin Realtime (nu și istoricul încărcat la intrare). */
  const onMessage = useCallback((handler: (m: Message) => void) => {
    messageHandlers.current.add(handler);
    return () => {
      messageHandlers.current.delete(handler);
    };
  }, []);

  const onPresenceJoin = useCallback((handler: (p: PresenceState) => void) => {
    joinHandlers.current.add(handler);
    return () => {
      joinHandlers.current.delete(handler);
    };
  }, []);

  const send = useCallback(<E extends BroadcastEvent>(event: E, payload: BroadcastEvents[E]) => {
    const ch = channelRef.current;
    if (!ch) return;
    void ch.send({ type: "broadcast", event, payload });
  }, []);

  const insertMessage = useCallback(
    async (m: NewMessage) => {
      if (!lesson) throw new Error("Lecția nu este încă încărcată.");
      const { data, error: insertError } = await getSupabase()
        .from("messages")
        .insert({ lesson_id: lesson.id, meta: {}, ...m })
        .select()
        .single();
      if (insertError) throw insertError;
      addMessages([data as Message]);
      return data as Message;
    },
    [lesson, addMessages],
  );

  const connected = useMemo(
    () => ({
      teacher: presence.some((p) => p.role === "teacher"),
      student: presence.some((p) => p.role === "student"),
      class: presence.some((p) => p.role === "class"),
      desk: presence.some((p) => p.role === "desk"),
    }),
    [presence],
  );

  return {
    lesson,
    setLesson,
    userId,
    error,
    messages,
    summary,
    setSummary,
    connection,
    presence,
    connected,
    on,
    onPresenceJoin,
    onMessage,
    ready,
    send,
    insertMessage,
  };
}

export type LessonApi = ReturnType<typeof useLesson>;
