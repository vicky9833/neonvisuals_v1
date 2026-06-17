import { Package } from "lucide-react";
import { PagePlaceholder } from "@/components/dashboard/PagePlaceholder";

export default function OrdersPage() {
  return (
    <PagePlaceholder
      title="Orders"
      icon={<Package className="size-8" />}
      description="Track production and delivery of your gifting orders. Coming soon — this feature is being built."
    />
  );
}
