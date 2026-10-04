import type { Metadata } from "next";
import { StudentScreen } from "@/components/screens/client-screens";

export const metadata: Metadata = { title: "Insigna elevului · SIGNals" };

export default async function StudentPage({ params }: PageProps<"/elev/[code]">) {
  const { code } = await params;
  return <StudentScreen code={code.toUpperCase()} />;
}
