"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";

/** Animațiile respectă „reduce motion” din sistem; notificările apar jos, la îndemâna degetului. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster position="bottom-center" richColors closeButton />
    </MotionConfig>
  );
}
