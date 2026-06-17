import { SetPageTitle } from "@/components/dashboard/DashboardProvider";
import { OccasionsClient } from "@/components/occasions/OccasionsClient";

export default function OccasionsPage() {
  return (
    <>
      <SetPageTitle title="Occasion Calendar" />
      <OccasionsClient />
    </>
  );
}
