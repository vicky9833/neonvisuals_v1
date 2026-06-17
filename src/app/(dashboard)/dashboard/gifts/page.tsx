import { SetPageTitle } from "@/components/dashboard/DashboardProvider";
import { GiftsClient } from "@/components/gifts/GiftsClient";

export default function GiftHistoryPage() {
  return (
    <>
      <SetPageTitle title="Gift History" />
      <GiftsClient />
    </>
  );
}
