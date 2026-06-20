import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listOrders, type Order } from "@/lib/engines/order";
import { listInvoices, type Invoice } from "@/lib/engines/billing";
import type { Company } from "@/lib/auth-types";

export interface AdminClientRow {
  id: string;
  name: string;
  industry: string | null;
  employee_count: string | null;
  city: string | null;
  employees: number;
  orders: number;
  revenue: number;
  created_at: string;
}

export interface ClientListStats {
  totalCompanies: number;
  totalEmployees: number;
  totalRevenue: number;
}

export async function listAdminClients(): Promise<{
  clients: AdminClientRow[];
  stats: ClientListStats;
}> {
  const supa = createAdminClient();

  const [{ data: companies }, { data: employees }, { data: orders }] =
    await Promise.all([
      supa
        .from("companies")
        .select("id, name, industry, employee_count, city, created_at")
        .order("created_at", { ascending: false }),
      supa.from("employees").select("company_id").eq("is_active", true),
      supa.from("orders").select("company_id, grand_total, status"),
    ]);

  const empByCompany = new Map<string, number>();
  for (const e of employees ?? []) {
    const id = e.company_id as string | null;
    if (id) empByCompany.set(id, (empByCompany.get(id) ?? 0) + 1);
  }

  const orderCountByCompany = new Map<string, number>();
  const revenueByCompany = new Map<string, number>();
  for (const o of orders ?? []) {
    const id = o.company_id as string | null;
    if (!id) continue;
    orderCountByCompany.set(id, (orderCountByCompany.get(id) ?? 0) + 1);
    if (o.status !== "cancelled") {
      revenueByCompany.set(
        id,
        (revenueByCompany.get(id) ?? 0) + Number(o.grand_total ?? 0),
      );
    }
  }

  const clients: AdminClientRow[] = (companies ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    industry: (c.industry as string) ?? null,
    employee_count: (c.employee_count as string) ?? null,
    city: (c.city as string) ?? null,
    employees: empByCompany.get(c.id as string) ?? 0,
    orders: orderCountByCompany.get(c.id as string) ?? 0,
    revenue: revenueByCompany.get(c.id as string) ?? 0,
    created_at: c.created_at as string,
  }));

  const stats: ClientListStats = {
    totalCompanies: clients.length,
    totalEmployees: clients.reduce((s, c) => s + c.employees, 0),
    totalRevenue: clients.reduce((s, c) => s + c.revenue, 0),
  };

  return { clients, stats };
}

export interface ClientEmployee {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  designation: string | null;
}

export interface ClientGift {
  id: string;
  product_name: string;
  occasion_type: string;
  gifted_date: string;
  employee_name?: string | null;
  desk_test_status: string | null;
}

export interface ClientQuote {
  id: string;
  quote_number: string | null;
  status: string;
  created_at: string;
}

export interface ClientDetailData {
  company: Company;
  employees: ClientEmployee[];
  orders: Order[];
  invoices: Invoice[];
  gifts: ClientGift[];
  quotes: ClientQuote[];
  stats: {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    employees: number;
    giftsSent: number;
    deskTestScore: number;
  };
}

export async function getClientDetail(
  companyId: string,
): Promise<ClientDetailData | null> {
  const supa = createAdminClient();
  const { data: company } = await supa
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) return null;

  const [employeesRes, ordersRes, invoicesRes, giftsRes, quotesRes] =
    await Promise.all([
      supa
        .from("employees")
        .select("id, full_name, email, department, designation")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("full_name"),
      listOrders({ companyId, pageSize: 200 }),
      listInvoices({ companyId, pageSize: 200 }),
      supa
        .from("gift_records")
        .select("id, product_name, occasion_type, gifted_date, desk_test_status, employees(full_name)")
        .eq("company_id", companyId)
        .eq("is_archived", false)
        .order("gifted_date", { ascending: false })
        .limit(200),
      supa
        .from("quotes")
        .select("id, quote_number, status, created_at")
        .ilike("client_company", (company.name as string) ?? "")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const employees: ClientEmployee[] = (employeesRes.data ?? []).map((e) => ({
    id: e.id as string,
    name: (e.full_name as string) ?? "Employee",
    email: (e.email as string) ?? null,
    department: (e.department as string) ?? null,
    designation: (e.designation as string) ?? null,
  }));

  const gifts: ClientGift[] = (giftsRes.data ?? []).map((g) => {
    const emp = (g as { employees?: { full_name?: string } }).employees;
    return {
      id: g.id as string,
      product_name: g.product_name as string,
      occasion_type: g.occasion_type as string,
      gifted_date: g.gifted_date as string,
      employee_name: emp?.full_name ?? null,
      desk_test_status: (g.desk_test_status as string) ?? null,
    };
  });

  const quotes: ClientQuote[] = (quotesRes.data ?? []).map((q) => ({
    id: q.id as string,
    quote_number: (q.quote_number as string) ?? null,
    status: q.status as string,
    created_at: q.created_at as string,
  }));

  const orders = ordersRes.orders;
  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.grand_total ?? 0), 0);
  const onDesk = gifts.filter((g) => g.desk_test_status === "on_desk").length;
  const deskTestScore =
    gifts.length > 0 ? Math.round((onDesk / gifts.length) * 100) : 0;

  return {
    company: company as Company,
    employees,
    orders,
    invoices: invoicesRes.invoices,
    gifts,
    quotes,
    stats: {
      totalOrders: orders.length,
      totalRevenue: revenue,
      avgOrderValue: orders.length > 0 ? Math.round(revenue / orders.length) : 0,
      employees: employees.length,
      giftsSent: gifts.length,
      deskTestScore,
    },
  };
}
