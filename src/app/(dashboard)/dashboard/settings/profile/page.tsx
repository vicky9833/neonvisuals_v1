import { UserRound } from "lucide-react";
import { PagePlaceholder } from "@/components/dashboard/PagePlaceholder";

export default function ProfileSettingsPage() {
  return (
    <PagePlaceholder
      title="My Profile"
      icon={<UserRound className="size-8" />}
      description="Update your name, phone, and avatar. Coming soon - this feature is being built."
    />
  );
}
