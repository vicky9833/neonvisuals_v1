$ErrorActionPreference = 'Stop'
function EnvVal($k) { $l = Select-String -Path 'c:\neonvisuals_v1\.env.local' -Pattern ("^" + [regex]::Escape($k) + "=") | Select-Object -First 1; return ($l.Line -split '=', 2)[1].Trim() }
$SUPA = EnvVal 'NEXT_PUBLIC_SUPABASE_URL'
$ANON = EnvVal 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
$SRK  = EnvVal 'SUPABASE_SERVICE_ROLE_KEY'
$UA = 'neonvisuals-2b-verify/1.0'
$PSDefaultParameterValues = @{ 'Invoke-RestMethod:UserAgent' = $UA }
$admin = @{ apikey = $SRK; Authorization = "Bearer $SRK"; 'Content-Type' = 'application/json' }
$runid = Get-Date -Format 'yyyyMMddHHmmss'
$pw = "T2b!$runid!pw"

function NewUser($tag) {
  $email = "t2b_${runid}_$tag@example.com"
  $b = @{ email = $email; password = $pw; email_confirm = $true } | ConvertTo-Json
  $u = Invoke-RestMethod -Method Post -Uri "$SUPA/auth/v1/admin/users" -Headers $admin -Body $b
  return @{ id = $u.id; email = $email }
}
function Token($email) {
  $b = @{ email = $email; password = $pw } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Post -Uri "$SUPA/auth/v1/token?grant_type=password" -Headers @{ apikey = $ANON; 'Content-Type' = 'application/json' } -Body $b
  return $r.access_token
}
function UserHdr($tok) { return @{ apikey = $ANON; Authorization = "Bearer $tok"; 'Content-Type' = 'application/json' } }

$staff  = NewUser 'staff'
$tenant = NewUser 'tenant'
Write-Output "STAFF_UID=$($staff.id)  TENANT_UID=$($tenant.id)"

# Make staff a platform-staff member (owner) via service role
$psRow = @{ user_id = $staff.id; role = 'owner' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$SUPA/rest/v1/platform_staff" -Headers ($admin + @{ Prefer = 'return=minimal' }) -Body $psRow | Out-Null
Write-Output "INSERTED platform_staff(owner) for staff"

# Current global settings (service role) — we PATCH back the same value (no data change)
$cur = Invoke-RestMethod -Method Get -Uri "$SUPA/rest/v1/system_settings?id=eq.global&select=settings" -Headers $admin
$curSettings = $cur[0].settings
$patchBody = @{ settings = $curSettings } | ConvertTo-Json -Depth 20

$staffTok  = Token $staff.email
$tenantTok = Token $tenant.email

Write-Output "===== STAFF (platform_staff owner) ====="
$sSel = Invoke-RestMethod -Method Get -Uri "$SUPA/rest/v1/system_settings?id=eq.global&select=id" -Headers (UserHdr $staffTok)
Write-Output ("STAFF_SELECT_ROWS=" + @($sSel).Count)
$sUpd = Invoke-RestMethod -Method Patch -Uri "$SUPA/rest/v1/system_settings?id=eq.global" -Headers ((UserHdr $staffTok) + @{ Prefer = 'return=representation' }) -Body $patchBody
Write-Output ("STAFF_UPDATE_ROWS=" + @($sUpd).Count)

Write-Output "===== TENANT (no platform_staff, no membership) ====="
$tSel = Invoke-RestMethod -Method Get -Uri "$SUPA/rest/v1/system_settings?id=eq.global&select=id" -Headers (UserHdr $tenantTok)
Write-Output ("TENANT_SELECT_ROWS=" + @($tSel).Count)
$tUpd = Invoke-RestMethod -Method Patch -Uri "$SUPA/rest/v1/system_settings?id=eq.global" -Headers ((UserHdr $tenantTok) + @{ Prefer = 'return=representation' }) -Body $patchBody
Write-Output ("TENANT_UPDATE_ROWS=" + @($tUpd).Count)

Write-Output "===== CLEANUP ====="
Invoke-RestMethod -Method Delete -Uri "$SUPA/rest/v1/platform_staff?user_id=eq.$($staff.id)" -Headers ($admin + @{ Prefer = 'return=minimal' }) | Out-Null
Invoke-RestMethod -Method Delete -Uri "$SUPA/auth/v1/admin/users/$($staff.id)" -Headers $admin | Out-Null
Invoke-RestMethod -Method Delete -Uri "$SUPA/auth/v1/admin/users/$($tenant.id)" -Headers $admin | Out-Null
Start-Sleep -Seconds 2
$residPs = Invoke-RestMethod -Method Get -Uri "$SUPA/rest/v1/platform_staff?user_id=in.($($staff.id),$($tenant.id))&select=user_id" -Headers $admin
Write-Output ("RESIDUE_platform_staff=" + @($residPs).Count)
$residProf = Invoke-RestMethod -Method Get -Uri "$SUPA/rest/v1/profiles?email=like.t2b_*&select=id" -Headers $admin
Write-Output ("RESIDUE_profiles_t2b=" + @($residProf).Count)
$au = Invoke-RestMethod -Method Get -Uri "$SUPA/auth/v1/admin/users?page=1&per_page=200" -Headers $admin
Write-Output ("RESIDUE_auth_users_t2b=" + @($au.users | Where-Object { $_.email -like 't2b_*' }).Count)
