# 3a Item 5 — Type-lie cleanup (Profile.role)

## Change
`src/lib/auth-types.ts`:
- Removed the retired `role: Role` field from the `Profile` interface (the DB column is
  `_deprecated_role` since 2b; nothing reads it).
- Removed the now-unused `export type Role = "super_admin" | "admin" | "client"`.

Effective diff:
```
-export type Role = "super_admin" | "admin" | "client";
-
 export interface Profile {
   id: string;
   email: string;
   full_name: string;
   phone: string | null;
-  role: Role;
   company_id: string | null;
   ...
 }
```

## Confirmation
- Grep: no code references `Profile.role`, `.role` off a profile object, or imports `Role`
  from `auth-types` (all `.role` hits are `platform_staff.role` / `company_members.role`,
  employee `brief.role`/CSV `row.role`, or matrix `CompanyRole`/`PlatformRole`).
- **`tsc --noEmit` clean** (exit 0) after the removal — nothing broke, confirming no live
  consumer of the retired field.
