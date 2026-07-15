import { Building2 } from "lucide-react";
import { PagePlaceholder } from "@/components/dashboard/PagePlaceholder";

export default function CompanySettingsPage() {
  return (
    <PagePlaceholder
      title="Company Settings"
      icon={<Building2 className="size-8" />}
      description="Manage your company profile, GST details, and gifting preferences. Coming soon - this feature is being built."
    />
  );
}
