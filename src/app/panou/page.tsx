import type { Metadata } from "next";
import { DashboardScreen } from "@/components/screens/client-screens";

export const metadata: Metadata = { title: "Panoul meu — Punte" };

export default function DashboardPage() {
  return <DashboardScreen />;
}
