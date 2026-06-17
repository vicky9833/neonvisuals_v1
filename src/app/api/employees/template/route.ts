import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TEMPLATE = [
  "name,email,employee_code,phone,department,designation,date_of_birth,joining_date,manager_name,tshirt_size,dietary_preference",
  "Priya Sharma,priya@company.com,EMP001,9876543210,Engineering,Software Engineer,15/08/1995,01/04/2023,Vikas V,M,vegetarian",
  "Rahul Kumar,rahul@company.com,EMP002,9876543211,Design,Product Designer,22/03/1993,15/07/2022,Priya Sharma,L,non_vegetarian",
].join("\r\n");

export function GET() {
  return new NextResponse("\uFEFF" + TEMPLATE, {
    status: 200,
    headers: {
      "Content-Type": "text/csv;charset=utf-8;",
      "Content-Disposition":
        'attachment; filename="neon-visuals-employee-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
