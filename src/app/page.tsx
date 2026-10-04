import HomeScreen from "@/components/screens/home-screen";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { next } = await searchParams;
  return <HomeScreen next={typeof next === "string" ? next : undefined} />;
}
