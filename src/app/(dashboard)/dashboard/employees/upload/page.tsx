import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SetPageTitle } from "@/components/dashboard/DashboardProvider";
import { CSVUpload } from "@/components/employees/CSVUpload";

export default function EmployeeUploadPage() {
  return (
    <div className="space-y-6">
      <SetPageTitle title="Upload Employees" />
      <div>
        <Link
          href="/dashboard/employees"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#6B7280] hover:text-navy"
        >
          <ArrowLeft className="size-4" /> Back to Team
        </Link>
        <h1 className="font-heading mt-3 text-2xl font-bold text-navy">
          Upload Your Team
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Import your employees from a CSV or Excel file. We&apos;ll validate
          everything before anything is saved.
        </p>
      </div>
      <CSVUpload />
    </div>
  );
}
