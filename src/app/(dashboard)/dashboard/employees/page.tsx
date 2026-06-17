import { SetPageTitle } from "@/components/dashboard/DashboardProvider";
import { EmployeeList } from "@/components/employees/EmployeeList";

export default function EmployeesPage() {
  return (
    <>
      <SetPageTitle title="Team Members" />
      <EmployeeList />
    </>
  );
}
