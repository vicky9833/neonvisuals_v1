# Item 1 — Role-audience resolution + tenant isolation — PASS

`resolveAudienceSpec(client, spec, {companyId, departmentId})` maps each §7 audience to an EXACT
user_id set (pinned role-sets, not reinterpreted). Evidence: `1_audience_run.txt`.

Fixtures: company A (owner, org_admin, hr, manager, viewer) + dept D (manager_id = mgr, mgr
assigned department_id=D) + company B (its own hr) + a t6a platform_staff(admin) user.

```
tenant hr           -> {hr}                              PASS
tenant org_admin    -> {admin}                           PASS
tenant org_owner    -> {owner}                           PASS
tenant dept_manager(D) -> {mgr} only                     PASS   (departments.manager_id ∪ company_members manager@D)
platform_admin      -> includes t6a platform user        PASS   (platform_staff role IN {owner,admin})
platform_admin      -> excludes ALL tenant users         PASS
isolation: A.hr excludes B.hr; B.hr -> {bHr} only        PASS   (tenant specs always constrained to companyId)
dept_manager with no departmentId -> [] (no leak)        PASS
```

Pinned mappings implemented: tenant hr/org_admin/org_owner → `company_members(role, status=active)`;
dept_manager → `departments.manager_id` (same company) ∪ `company_members(role=manager,
department_id)`; platform_admin → `platform_staff role IN {owner,admin}`, platform_ops → ops,
platform_owner → owner, platform_finance → finance. Tenant resolution NEVER crosses company_id.
