import type { Metadata } from "next";
import { DashboardScreen } from "@/components/screens/client-screens";

export const metadata: Metadata = { title: "Panoul meu — SIGNals" };

export default function DashboardPage() {
  return <DashboardScreen />;
}
