export type Role = "teacher" | "student" | "class";

export type SemaforState = "neutru" | "semneaza" | "intrebare" | "inteles" | "neinteles";

export type BuzzKind = "nume" | "tema" | "intrebare" | "atentie";

export type MessageKind = "sign" | "speech" | "typed" | "system";

export interface Lesson {
  id: string;
  code: string;
  subject: string;
  title: string;
  terms: string[];
  student_name: string;
  teacher_id: string;
  status: "active" | "ended";
  created_at: string;
  ended_at: string | null;
}

export interface MessageMeta {
  signId?: string;
  fromDictionary?: boolean;
  confidence?: number;
  manual?: boolean;
  prosody?: { rate: number; pitch: number };
  voice?: { name: string | null; style: VoiceStyle };
  demo?: boolean;
}

export interface Message {
  id: string;
  lesson_id: string;
  sender_role: "teacher" | "student";
  sender_name: string | null;
  text: string;
  kind: MessageKind;
  meta: MessageMeta;
  created_at: string;
}

export interface LessonSummary {
  lesson_id: string;
  notes: string[];
  homework: string | null;
  terms: string[];
  simple_summary: string;
  created_at?: string;
  fallback?: boolean;
}

export type VoiceStyle = "adolescent" | "calm" | "energic";

export interface PresenceState {
  role: Role;
  name: string;
  online_at: string;
}

/** Evenimentele Broadcast ale canalului lesson:{code}. Nu se salvează. */
export interface BroadcastEvents {
  semafor: { state: SemaforState };
  caption_interim: { text: string };
  buzz: { kind: BuzzKind; text?: string };
  teacher_alert: { signId: string; text: string; state: SemaforState };
  teacher_alert_ack: { signId?: string };
  pending_sign: { signId: string; text: string };
  pending_cancel: Record<string, never>;
  summary_ready: { summary: LessonSummary };
}

export type BroadcastEvent = keyof BroadcastEvents;
