import type { Metadata } from "next";
import { AdminScreen } from "@/components/screens/client-screens";

export const metadata: Metadata = { title: "Administrare — SIGNals" };

export default function AdminPage() {
  return <AdminScreen />;
}
