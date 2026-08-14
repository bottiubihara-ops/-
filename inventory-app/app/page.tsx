import { requireAuthPage } from "@/lib/auth";
import EntryScreen from "@/components/EntryScreen";

export default async function Home() {
  await requireAuthPage();
  return <EntryScreen />;
}
