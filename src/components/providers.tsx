"use client";

import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";

/**
 * Apariția la derulare: elementele `.reveal` sunt vizibile implicit; abia după ce observatorul
 * pornește le ascundem până intră în ecran. Fără JS sau cu „reduce motion”, totul rămâne vizibil.
 */
function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    const watch = (root: ParentNode) => root.querySelectorAll(".reveal:not(.is-in)").forEach((el) => io.observe(el));
    watch(document);
    const mo = new MutationObserver(() => watch(document));
    mo.observe(document.body, { childList: true, subtree: true });
    document.documentElement.classList.add("reveal-ready");
    return () => {
      io.disconnect();
      mo.disconnect();
      document.documentElement.classList.remove("reveal-ready");
    };
  }, []);
  return null;
}

/** Animațiile respectă „reduce motion” din sistem; notificările apar jos, la îndemâna degetului. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <RevealObserver />
      {children}
      <Toaster position="bottom-center" richColors closeButton />
    </MotionConfig>
  );
}
