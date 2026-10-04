import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterScreen } from "@/components/screens/client-screens";

export const metadata: Metadata = { title: "Înregistrarea elevului · Punte" };

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterScreen />
    </Suspense>
  );
}
