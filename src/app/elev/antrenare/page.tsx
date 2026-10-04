import type { Metadata } from "next";
import { TrainingScreen } from "@/components/screens/client-screens";

export const metadata: Metadata = { title: "Antrenează semnele · Punte" };

export default function TrainingPage() {
  return <TrainingScreen />;
}
