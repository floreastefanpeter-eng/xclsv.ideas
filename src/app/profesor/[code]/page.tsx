import type { Metadata } from "next";
import { TeacherScreen } from "@/components/screens/client-screens";

export const metadata: Metadata = { title: "Insigna profesorului · Punte" };

export default async function TeacherPage({ params }: PageProps<"/profesor/[code]">) {
  const { code } = await params;
  return <TeacherScreen code={code.toUpperCase()} />;
}
