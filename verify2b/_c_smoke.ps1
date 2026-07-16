$ErrorActionPreference = 'Stop'
function EnvVal($k) { $l = Select-String -Path 'c:\neonvisuals_v1\.env.local' -Pattern ("^" + [regex]::Escape($k) + "=") | Select-Object -First 1; return ($l.Line -split '=', 2)[1].Trim() }
$PREVIEW = 'https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app'
$SUPA = EnvVal 'NEXT_PUBLIC_SUPABASE_URL'
$ANON = EnvVal 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
$SRK  = EnvVal 'SUPABASE_SERVICE_ROLE_KEY'
$BYP  = EnvVal 'VERCEL_AUTOMATION_BYPASS'
$UA = 'neonvisuals-2b-verify/1.0'
$PSDefaultParameterValues = @{ 'Invoke-RestMethod:UserAgent' = $UA }
Add-Type -AssemblyName System.Net.Http

# ---------- Preview app boot (bypass token, redirects not followed) ----------
$h = New-Object System.Net.Http.HttpClientHandler; $h.AllowAutoRedirect = $false
$c = New-Object System.Net.Http.HttpClient($h); $c.Timeout = [TimeSpan]::FromSeconds(30)
$c.DefaultRequestHeaders.Add('x-vercel-protection-bypass', $BYP)
function Page($p) {
  $r = $c.SendAsync((New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, "$PREVIEW$p"))).Result
  $loc = ''; if ($r.Headers.Location) { $loc = $r.Headers.Location.ToString() }
  Write-Output ("PAGE {0,-26} {1}  loc='{2}'" -f $p, [int]$r.StatusCode, $loc)
}
Write-Output '===== PREVIEW APP BOOT ====='
Page '/'; Page '/login'; Page '/register'; Page '/products'; Page '/admin'; Page '/dashboard'

# ---------- Real signup against shared DB (renamed profiles.role) ----------
$admin = @{ apikey = $SRK; Authorization = "Bearer $SRK"; 'Content-Type' = 'application/json' }
$runid = Get-Date -Format 'yyyyMMddHHmmss'
$email = "t2b_${runid}_csmoke@example.com"
Write-Output "===== REAL SIGNUP ($email) ====="
$body = @{ email = $email; password = "T2b!$runid!pw"; email_confirm = $true; user_metadata = @{ full_name = "t2b $runid CSmoke" } } | ConvertTo-Json
$u = Invoke-RestMethod -Method Post -Uri "$SUPA/auth/v1/admin/users" -Headers $admin -Body $body
Start-Sleep -Seconds 2
$prof = Invoke-RestMethod -Method Get -Uri "$SUPA/rest/v1/profiles?id=eq.$($u.id)&select=id,email,full_name,_deprecated_role,is_onboarded" -Headers $admin
Write-Output "PROFILE_ROW:"; $prof | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Delete -Uri "$SUPA/auth/v1/admin/users/$($u.id)" -Headers $admin | Out-Null
Start-Sleep -Seconds 2
$resid = Invoke-RestMethod -Method Get -Uri "$SUPA/rest/v1/profiles?email=like.t2b_*&select=id" -Headers $admin
Write-Output ("RESIDUE_profiles_t2b=" + @($resid).Count)

# ---------- system_settings: platform-staff allowed, tenant denied ----------
Write-Output '===== system_settings via user JWT ====='
$staff = Invoke-RestMethod -Method Post -Uri "$SUPA/auth/v1/admin/users" -Headers $admin -Body (@{ email = "t2b_${runid}_staff@example.com"; password = "T2b!$runid!pw"; email_confirm = $true } | ConvertTo-Json)
$tenant = Invoke-RestMethod -Method Post -Uri "$SUPA/auth/v1/admin/users" -Headers $admin -Body (@{ email = "t2b_${runid}_tenant@example.com"; password = "T2b!$runid!pw"; email_confirm = $true } | ConvertTo-Json)
Invoke-RestMethod -Method Post -Uri "$SUPA/rest/v1/platform_staff" -Headers ($admin + @{ Prefer = 'return=minimal' }) -Body (@{ user_id = $staff.id; role = 'owner' } | ConvertTo-Json) | Out-Null
function Tok($em) { (Invoke-RestMethod -Method Post -Uri "$SUPA/auth/v1/token?grant_type=password" -Headers @{ apikey = $ANON; 'Content-Type' = 'application/json' } -Body (@{ email = $em; password = "T2b!$runid!pw" } | ConvertTo-Json)).access_token }
$st = Tok "t2b_${runid}_staff@example.com"; $tn = Tok "t2b_${runid}_tenant@example.com"
$sSel = Invoke-RestMethod -Method Get -Uri "$SUPA/rest/v1/system_settings?id=eq.global&select=id" -Headers @{ apikey = $ANON; Authorization = "Bearer $st" }
$tSel = Invoke-RestMethod -Method Get -Uri "$SUPA/rest/v1/system_settings?id=eq.global&select=id" -Headers @{ apikey = $ANON; Authorization = "Bearer $tn" }
Write-Output ("STAFF_system_settings_rows=" + @($sSel).Count + "  TENANT_system_settings_rows=" + @($tSel).Count)
Invoke-RestMethod -Method Delete -Uri "$SUPA/rest/v1/platform_staff?user_id=eq.$($staff.id)" -Headers ($admin + @{ Prefer = 'return=minimal' }) | Out-Null
Invoke-RestMethod -Method Delete -Uri "$SUPA/auth/v1/admin/users/$($staff.id)" -Headers $admin | Out-Null
Invoke-RestMethod -Method Delete -Uri "$SUPA/auth/v1/admin/users/$($tenant.id)" -Headers $admin | Out-Null
Start-Sleep -Seconds 2
$au = Invoke-RestMethod -Method Get -Uri "$SUPA/auth/v1/admin/users?page=1&per_page=200" -Headers $admin
Write-Output ("RESIDUE_auth_users_t2b=" + @($au.users | Where-Object { $_.email -like 't2b_*' }).Count)
$rps = Invoke-RestMethod -Method Get -Uri "$SUPA/rest/v1/platform_staff?select=user_id" -Headers $admin
Write-Output ("platform_staff_total_rows=" + @($rps).Count)
