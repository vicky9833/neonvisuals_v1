/**
 * Route-group pass-through. The dashboard chrome (sidebar + topbar) lives in
 * src/app/(dashboard)/dashboard/layout.tsx so it only wraps /dashboard/* pages.
 */
export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
