import type { Metadata } from "next";
import { DeskScreen } from "@/components/screens/client-screens";

export const metadata: Metadata = { title: "Masa elevului — Punte" };

export default async function DeskPage({ params }: PageProps<"/masa/[code]">) {
  const { code } = await params;
  return <DeskScreen code={code.toUpperCase()} />;
}
