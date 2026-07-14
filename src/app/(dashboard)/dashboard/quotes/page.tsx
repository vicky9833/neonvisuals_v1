import { FileText } from "lucide-react";
import { PagePlaceholder } from "@/components/dashboard/PagePlaceholder";

export default function QuotesPage() {
  return (
    <PagePlaceholder
      title="My Quotes"
      icon={<FileText className="size-8" />}
      description="View and manage your gifting quotes. Coming soon - this feature is being built."
    />
  );
}
