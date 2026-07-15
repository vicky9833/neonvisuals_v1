import { describe, it, expect } from "vitest";
import { pageAccessFor, resolvePageDecision } from "./allowlist";
import { authorize, type TenantPrincipal } from "./matrix";

const viewer: TenantPrincipal = { plane: "tenant", role: "viewer", departmentId: null, approvalLimit: null };

// Auth states
const TENANT_MEMBER = { authenticated: true, isPlatform: false, hasMembership: true };
const TENANT_NO_MEMBERSHIP = { authenticated: true, isPlatform: false, hasMembership: false };
const PLATFORM = { authenticated: true, isPlatform: true, hasMembership: false };
const ANON = { authenticated: false, isPlatform: false, hasMembership: false };

describe("Allowlist classification (item 2)", () => {
  it("/ops → platform", () => expect(pageAccessFor("/ops")).toBe("platform"));
  it("/ops/leads → platform", () => expect(pageAccessFor("/ops/leads")).toBe("platform"));
  it("/dashboard → tenant", () => expect(pageAccessFor("/dashboard")).toBe("tenant"));
  it("/dashboard/orders → tenant", () => expect(pageAccessFor("/dashboard/orders")).toBe("tenant"));
  it("/onboarding → onboarding", () => expect(pageAccessFor("/onboarding")).toBe("onboarding"));
  it("/login → auth", () => expect(pageAccessFor("/login")).toBe("auth"));
  it("/ (home) → public", () => expect(pageAccessFor("/")).toBe("public"));
  it("/products/x → public", () => expect(pageAccessFor("/products/some-slug")).toBe("public"));
  it("UNLISTED route → null (default-deny)", () => expect(pageAccessFor("/secret-unlisted")).toBeNull());
  it("/ops/vendors → denied (no vendor management)", () =>
    expect(pageAccessFor("/ops/vendors")).toBe("denied"));
});

describe("Proxy decision — default-deny (item 2 acceptance)", () => {
  it("ROUTE OFF THE ALLOWLIST default-denies with 403", () => {
    const d = resolvePageDecision(pageAccessFor("/secret-unlisted"), TENANT_MEMBER);
    expect(d).toEqual({ type: "deny", status: 403, body: "Forbidden — route not on allowlist" });
  });

  it("TENANT USER hitting /ops → 403", () => {
    const d = resolvePageDecision(pageAccessFor("/ops"), TENANT_MEMBER);
    expect(d).toEqual({ type: "deny", status: 403, body: "Forbidden — platform access required" });
  });

  it("/ops/vendors → 403 for platform staff too (explicitly disabled)", () => {
    const d = resolvePageDecision(pageAccessFor("/ops/vendors"), PLATFORM);
    expect(d).toEqual({ type: "deny", status: 403, body: "Forbidden — route disabled" });
  });

  it("ORPHAN USER (authenticated, zero memberships) on /dashboard → redirect to /onboarding", () => {
    const d = resolvePageDecision(pageAccessFor("/dashboard"), TENANT_NO_MEMBERSHIP);
    expect(d).toEqual({ type: "redirect", to: "/onboarding" });
  });

  it("tenant member on /dashboard → pass", () => {
    expect(resolvePageDecision(pageAccessFor("/dashboard"), TENANT_MEMBER)).toEqual({ type: "pass" });
  });

  it("platform staff on /ops → pass", () => {
    expect(resolvePageDecision(pageAccessFor("/ops"), PLATFORM)).toEqual({ type: "pass" });
  });

  it("platform staff on /dashboard → redirected to /ops", () => {
    expect(resolvePageDecision(pageAccessFor("/dashboard"), PLATFORM)).toEqual({ type: "redirect", to: "/ops" });
  });

  it("anonymous on /dashboard → redirect to /login", () => {
    expect(resolvePageDecision(pageAccessFor("/dashboard"), ANON)).toEqual({ type: "redirect", to: "/login" });
  });

  it("anonymous on public page → pass", () => {
    expect(resolvePageDecision(pageAccessFor("/products/x"), ANON)).toEqual({ type: "pass" });
  });
});

describe("LOAD-BEARING: tenant viewer WRITE on money tables → 403 from authorize() (mig-020 gap)", () => {
  // migration 020 write RLS is tenant-isolation-only (any member can write);
  // authorize() is the SOLE role gate. A viewer must be denied every write.
  it("viewer denied quote create (quote.request)", () => {
    expect(authorize(viewer, "quote.request").effect).toBe("deny");
  });
  it("viewer denied quote approve (quote.approve)", () => {
    expect(authorize(viewer, "quote.approve").effect).toBe("deny");
  });
  it("viewer denied invoice/billing write (billing.manage)", () => {
    expect(authorize(viewer, "billing.manage").effect).toBe("deny");
  });

  it("the 403 body a route emits for a viewer quote WRITE", () => {
    const decision = authorize(viewer, "quote.request");
    expect(decision.effect).toBe("deny");
    // requireTenant() throws ApiAuthError(403,"forbidden", reason) → apiAuthErrorResponse:
    const body = { error: "forbidden", message: decision.reason };
    expect(body).toEqual({
      error: "forbidden",
      message: "tenant role 'viewer' denied 'quote.request'",
    });
  });
});
