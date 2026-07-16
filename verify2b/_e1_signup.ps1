$ErrorActionPreference = 'Stop'
function EnvVal($k) { $l = Select-String -Path 'c:\neonvisuals_v1\.env.local' -Pattern ("^" + [regex]::Escape($k) + "=") | Select-Object -First 1; return ($l.Line -split '=', 2)[1].Trim() }
$SUPA = EnvVal 'NEXT_PUBLIC_SUPABASE_URL'
$SRK  = EnvVal 'SUPABASE_SERVICE_ROLE_KEY'
$runid = Get-Date -Format 'yyyyMMddHHmmss'
$email = "t2b_${runid}_signup@example.com"
$hAdmin = @{ apikey = $SRK; Authorization = "Bearer $SRK"; 'Content-Type' = 'application/json' }
$UA = 'neonvisuals-2b-verify/1.0'  # non-browser UA: GoTrue blocks secret keys from browser-like UAs
$PSDefaultParameterValues = @{ 'Invoke-RestMethod:UserAgent' = $UA }

Write-Output "RUNID=$runid  EMAIL=$email"

# 1. Real signup via GoTrue admin API -> fires on_auth_user_created -> handle_new_user
$body = @{ email = $email; password = "T2b!$runid!pw"; email_confirm = $true; user_metadata = @{ full_name = "t2b ${runid} Tester" } } | ConvertTo-Json
$created = Invoke-RestMethod -Method Post -Uri "$SUPA/auth/v1/admin/users" -Headers $hAdmin -Body $body
$uid = $created.id
Write-Output "CREATED_AUTH_USER_ID=$uid"

Start-Sleep -Seconds 2  # let the AFTER INSERT trigger settle

# 2. Read the profile row created by the trigger (service role bypasses RLS)
$prof = Invoke-RestMethod -Method Get -Uri "$SUPA/rest/v1/profiles?id=eq.$uid&select=id,email,full_name,role,company_id,is_onboarded" -Headers $hAdmin
Write-Output "PROFILE_ROW:"
$prof | ConvertTo-Json -Depth 5

# 3. Delete the test user (cascades to profiles via profiles_id_fkey ON DELETE CASCADE)
Invoke-RestMethod -Method Delete -Uri "$SUPA/auth/v1/admin/users/$uid" -Headers $hAdmin | Out-Null
Write-Output "DELETED_AUTH_USER=$uid"

Start-Sleep -Seconds 2

# 4. Prove zero residue: profiles + auth users with t2b_ prefix
$resid = Invoke-RestMethod -Method Get -Uri "$SUPA/rest/v1/profiles?email=like.t2b_*&select=id,email" -Headers $hAdmin
Write-Output ("RESIDUE_PROFILES_COUNT=" + (@($resid).Count))
$au = Invoke-RestMethod -Method Get -Uri "$SUPA/auth/v1/admin/users?page=1&per_page=200" -Headers $hAdmin
$leftover = @($au.users | Where-Object { $_.email -like 't2b_*' })
Write-Output ("RESIDUE_AUTH_USERS_COUNT=" + $leftover.Count)
