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
