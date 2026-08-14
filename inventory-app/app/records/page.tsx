import { requireAuthPage } from "@/lib/auth";
import RecordsScreen from "@/components/RecordsScreen";

export default async function RecordsPage() {
  await requireAuthPage();
  return <RecordsScreen />;
}
