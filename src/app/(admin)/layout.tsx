import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { AdminProvider } from "@/components/admin/AdminProvider";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileSidebar } from "@/components/admin/AdminMobileSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * Admin shell. proxy.ts already restricts /admin/* to super_admin; this layout
 * fetches the profile once and shares it with the sidebar/topbar via context.
 * Provides ONLY chrome - individual pages render their own PageHeader.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profileWithCompany = await getProfile();
  if (!profileWithCompany) redirect("/login");
  if (profileWithCompany.role !== "super_admin") redirect("/dashboard");

  const { company: _company, ...profile } = profileWithCompany;

  return (
    <AdminProvider profile={profile}>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <AdminMobileSidebar />
        <div className="flex min-h-screen flex-col lg:pl-64">
          <AdminTopbar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}
