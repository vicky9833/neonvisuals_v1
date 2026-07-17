-- Prompt 7b: Approval Workflow + Budgets (closes the P2 quote.approve obligation).
--
-- DESIGN RULING (Prompt 7b, decision 1): approval_status is ORTHOGONAL to quotes.status.
--   quotes.status        = lifecycle (draft/sent/viewed/accepted/converted/rejected/expired/cancelled)
--   quotes.approval_status = approval track {not_required, pending, approved, rejected}
-- They are NEVER collapsed and one never implicitly drives the other. A quote can be
-- (status='sent', approval_status='pending') simultaneously.
--
-- Gift-state reversal (7a): keyed on (approval_status rejected + no linked order) -> resume
-- escalation, via the EXACT 7a clearGiftChosenForQuote path (order_id IS NULL only). The reject
-- route calls that helper directly (approval_status is orthogonal, so the quotes.status trigger
-- in updateQuoteStatus is not the driver here).
--
-- All columns are additive, nullable/defaulted, no drops. Existing quotes tenant RLS
-- (company_id IN user_company_ids()) already covers these columns — NO new policies. The role
-- gate is the authorize() matrix at the route layer (quote.approve).

alter table public.quotes
  add column if not exists approval_status text not null default 'not_required'
    check (approval_status in ('not_required', 'pending', 'approved', 'rejected'));

-- Routing (§7, decision 2): the ROLE a pending quote was escalated to. Unlimited approvers are
-- finance, org_admin, org_owner; the next approver for an over-limit hr/manager quote is finance
-- (preferred), else org_admin, else org_owner (always present). Informational for the view +
-- notification audience. Role-based single hop (multi-level chains are Enterprise, deferred).
alter table public.quotes
  add column if not exists approval_routed_to text
    check (approval_routed_to is null or approval_routed_to in ('finance', 'org_admin', 'org_owner'));

-- Who/when the quote was APPROVED (distinct from the accepted_at lifecycle stamp).
alter table public.quotes add column if not exists approved_by uuid references auth.users(id);
alter table public.quotes add column if not exists approved_at timestamptz;

-- Budget hint captured at request time (was previously dropped by requestQuote). Non-negative
-- rupee integer. The over-budget SIGNAL (item 4) compares the quote total against the occasion
-- type's default_budget; this column preserves the requester's stated budget for the view.
alter table public.quotes
  add column if not exists budget_hint integer
    check (budget_hint is null or budget_hint >= 0);

-- The approval view lists a company's pending-approval quotes, oldest first.
create index if not exists quotes_approval_pending_idx
  on public.quotes (company_id, created_at)
  where approval_status = 'pending';

notify pgrst, 'reload schema';
