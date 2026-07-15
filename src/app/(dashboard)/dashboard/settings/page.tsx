import { Settings } from "lucide-react";
import { PagePlaceholder } from "@/components/dashboard/PagePlaceholder";

export default function SettingsPage() {
  return (
    <PagePlaceholder
      title="Settings"
      icon={<Settings className="size-8" />}
      description="Manage your profile, company, and preferences. Coming soon - this feature is being built."
    />
  );
}
