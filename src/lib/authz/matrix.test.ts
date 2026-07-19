import { describe, it, expect } from "vitest";
import {
  authorize,
  TENANT_MATRIX,
  PLATFORM_MATRIX,
  COMPANY_ROLES,
  PLATFORM_ROLES,
  SHIPPING_ONLY_FIELDS,
  type CompanyRole,
  type PlatformRole,
  type TenantCapability,
  type PlatformCapability,
  type TenantPrincipal,
  type PlatformPrincipal,
} from "./matrix";

const tenant = (role: CompanyRole, departmentId: string | null = "dept-1", approvalLimit: number | null = 100_000): TenantPrincipal => ({
  plane: "tenant",
  role,
  departmentId,
  approvalLimit,
});
const platform = (role: PlatformRole): PlatformPrincipal => ({ plane: "platform", role });

const TENANT_CAPS = Object.keys(TENANT_MATRIX) as TenantCapability[];
const PLATFORM_CAPS = Object.keys(PLATFORM_MATRIX) as PlatformCapability[];

// A resourceCtx that satisfies every conditional class, so "Y"/conditional
// cells resolve to allow and only genuine "N" cells deny.
const PASSING_CTX = {
  resourceDepartmentId: "dept-1", // matches tenant() departmentId
  amount: 100_000, // == approvalLimit → allowed (≤)
  requestedPiiFields: SHIPPING_ONLY_FIELDS,
};

describe("TENANT PLANE (§6A) — every role × every capability", () => {
  for (const cap of TENANT_CAPS) {
    for (const role of COMPANY_ROLES) {
      const cell = TENANT_MATRIX[cap][role];
      it(`${cap} / ${role} (cell=${cell})`, () => {
        const d = authorize(tenant(role), cap, PASSING_CTX);
        if (cell === "N") {
          expect(d.effect).toBe("deny");
        } else {
          // Y, own-dept (matching), and limit (amount ≤ limit) all allow here.
          expect(d.effect).toBe("allow");
        }
        // Tenant capabilities never carry a platform audit obligation.
        expect(d.audit).toBe(false);
      });
    }
  }
});

describe("PLATFORM PLANE (§6B) — every role × every capability", () => {
  for (const cap of PLATFORM_CAPS) {
    for (const role of PLATFORM_ROLES) {
      const cell = PLATFORM_MATRIX[cap][role];
      it(`${cap} / ${role} (cell=${cell})`, () => {
        const d = authorize(platform(role), cap, PASSING_CTX);
        if (cell === "N") expect(d.effect).toBe("deny");
        else expect(d.effect).toBe("allow");
      });
    }
  }
});

describe("Plane isolation (default-deny across planes)", () => {
  it("tenant principal cannot use a platform capability", () => {
    const d = authorize(tenant("org_owner"), "platform.orgs.view_all");
    expect(d.effect).toBe("deny");
    expect(d.reason).toMatch(/wrong-plane/);
  });
  it("platform principal cannot use a tenant capability", () => {
    const d = authorize(platform("owner"), "employees.view_pii");
    expect(d.effect).toBe("deny");
    expect(d.reason).toMatch(/wrong-plane/);
  });
});

describe("Conditional class: own-dept (manager)", () => {
  it("PASS — resource in manager's own department", () => {
    const d = authorize(tenant("manager", "dept-1"), "employees.edit", { resourceDepartmentId: "dept-1" });
    expect(d).toMatchObject({ effect: "allow", conditional: "own-dept" });
  });
  it("FAIL — resource outside manager's department", () => {
    const d = authorize(tenant("manager", "dept-1"), "employees.edit", { resourceDepartmentId: "dept-2" });
    expect(d).toMatchObject({ effect: "deny", conditional: "own-dept" });
  });
  it("FAIL — manager has no department", () => {
    const d = authorize(tenant("manager", null), "employees.edit", { resourceDepartmentId: "dept-1" });
    expect(d).toMatchObject({ effect: "deny", conditional: "own-dept" });
  });
  it("FAIL — resource department not supplied", () => {
    const d = authorize(tenant("manager", "dept-1"), "employees.edit", {});
    expect(d).toMatchObject({ effect: "deny", conditional: "own-dept" });
  });
});

describe("Conditional class: at-most-limit (quote approval)", () => {
  it("PASS — hr amount at the limit", () => {
    const d = authorize(tenant("hr", "dept-1", 50_000), "quote.approve", { amount: 50_000 });
    expect(d).toMatchObject({ effect: "allow", conditional: "at-most-limit" });
  });
  it("PASS — manager amount below the limit", () => {
    const d = authorize(tenant("manager", "dept-1", 50_000), "quote.approve", { amount: 10_000 });
    expect(d).toMatchObject({ effect: "allow", conditional: "at-most-limit" });
  });
  it("FAIL — amount exceeds the limit", () => {
    const d = authorize(tenant("hr", "dept-1", 50_000), "quote.approve", { amount: 50_001 });
    expect(d).toMatchObject({ effect: "deny", conditional: "at-most-limit" });
  });
  it("FAIL — NULL approval_limit denies", () => {
    const d = authorize(tenant("manager", "dept-1", null), "quote.approve", { amount: 1 });
    expect(d).toMatchObject({ effect: "deny", conditional: "at-most-limit" });
  });
  it("owner/admin/finance bypass the limit compare (unlimited)", () => {
    for (const role of ["org_owner", "org_admin", "finance"] as CompanyRole[]) {
      const d = authorize(tenant(role, "dept-1", null), "quote.approve", { amount: 10_000_000 });
      expect(d.effect).toBe("allow");
      expect(d.conditional).toBeUndefined();
    }
  });
});

describe("Conditional class: shipping-only (platform ops PII)", () => {
  it("PASS — ops requesting only shipping fields", () => {
    const d = authorize(platform("ops"), "platform.pii.read", { requestedPiiFields: ["city", "pincode"] });
    expect(d).toMatchObject({ effect: "allow", conditional: "shipping-only", audit: true });
    expect(d.allowedFields).toEqual(SHIPPING_ONLY_FIELDS);
  });
  it("PASS — no explicit request returns the shipping allowlist", () => {
    const d = authorize(platform("ops"), "platform.pii.read");
    expect(d).toMatchObject({ effect: "allow", conditional: "shipping-only" });
    expect(d.allowedFields).toEqual(SHIPPING_ONLY_FIELDS);
  });
  it("FAIL — ops requesting a sensitive field (dob/phone)", () => {
    const d = authorize(platform("ops"), "platform.pii.read", { requestedPiiFields: ["dob_day", "phone"] });
    expect(d).toMatchObject({ effect: "deny", conditional: "shipping-only" });
  });
});

describe("§6A HARD RULE — finance/manager-outside-dept/viewer NEVER see DOB/phone/address", () => {
  it("finance denied employees.view_pii", () => {
    expect(authorize(tenant("finance"), "employees.view_pii").effect).toBe("deny");
  });
  it("viewer denied employees.view_pii", () => {
    expect(authorize(tenant("viewer"), "employees.view_pii").effect).toBe("deny");
  });
  it("manager denied employees.view_pii (not own-dept — a flat N in the matrix)", () => {
    expect(authorize(tenant("manager"), "employees.view_pii").effect).toBe("deny");
  });
});

describe("Audit obligation (cross-tenant / impersonation)", () => {
  it("platform owner cross-tenant order manage is audited", () => {
    expect(authorize(platform("owner"), "platform.orders.manage").audit).toBe(true);
  });
  it("platform admin PII read is audited (Y*)", () => {
    expect(authorize(platform("admin"), "platform.pii.read").audit).toBe(true);
  });
  it("support impersonation is audited (Y*)", () => {
    expect(authorize(platform("support"), "platform.impersonate").audit).toBe(true);
  });
  it("non-cross-tenant platform capability is not audited", () => {
    expect(authorize(platform("owner"), "platform.catalog.manage").audit).toBe(false);
  });
});

describe("P11b — platform.catalog.publish (owner/admin only, audited)", () => {
  it("owner may publish, and it is audited", () => {
    const d = authorize(platform("owner"), "platform.catalog.publish");
    expect(d.effect).toBe("allow");
    expect(d.audit).toBe(true);
  });
  it("admin may publish, and it is audited", () => {
    const d = authorize(platform("admin"), "platform.catalog.publish");
    expect(d.effect).toBe("allow");
    expect(d.audit).toBe(true);
  });
  it.each(["ops", "finance", "support"] as const)(
    "%s is denied publish (a tighter bar than products.manage edit)",
    (role) => {
      expect(authorize(platform(role), "platform.catalog.publish").effect).toBe("deny");
      // …while still permitted to EDIT the DB catalog.
      expect(authorize(platform(role), "platform.products.manage").effect).toBe("allow");
    },
  );
  it("a tenant principal can never publish (wrong-plane)", () => {
    const d = authorize(tenant("org_owner"), "platform.catalog.publish");
    expect(d.effect).toBe("deny");
    expect(d.reason).toMatch(/wrong-plane/);
  });
});
