"use client";

import dynamic from "next/dynamic";
import { LoadingScreen } from "@/components/punte/screen-state";

// MediaPipe și Web Speech rulează doar în browser: fără SSR.
export const TeacherScreen = dynamic(() => import("./teacher-screen"), {
  ssr: false,
  loading: () => <LoadingScreen />,
});
export const StudentScreen = dynamic(() => import("./student-screen"), {
  ssr: false,
  loading: () => <LoadingScreen />,
});
export const ClassScreen = dynamic(() => import("./class-screen"), {
  ssr: false,
  loading: () => <LoadingScreen dark />,
});
export const TrainingScreen = dynamic(() => import("./training-screen"), {
  ssr: false,
  loading: () => <LoadingScreen text="Se încarcă antrenarea…" />,
});
export const RegisterScreen = dynamic(() => import("./register-screen"), {
  ssr: false,
  loading: () => <LoadingScreen text="Se încarcă înregistrarea…" />,
});
export const DashboardScreen = dynamic(() => import("./dashboard-screen"), {
  ssr: false,
  loading: () => <LoadingScreen text="Se încarcă panoul…" />,
});
export const DeskScreen = dynamic(() => import("./desk-screen"), {
  ssr: false,
  loading: () => <LoadingScreen dark />,
});
