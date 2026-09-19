// components/panels/RecommendationsPanel.tsx — RSC async, fetch langsung dari lib/data
import { getRecommendations } from "@/lib/data/recommendations";
import { RecommendationsListClient } from "../modules/RecommendationsListClient";

export async function RecommendationsPanel() {
  const data = await getRecommendations();
  return <RecommendationsListClient initialData={data} />;
}
