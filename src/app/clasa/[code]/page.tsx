import type { Metadata } from "next";
import { ClassScreen } from "@/components/screens/client-screens";

export const metadata: Metadata = { title: "Ecranul clasei · SIGNals" };

export default async function ClassPage({ params }: PageProps<"/clasa/[code]">) {
  const { code } = await params;
  return <ClassScreen code={code.toUpperCase()} />;
}
