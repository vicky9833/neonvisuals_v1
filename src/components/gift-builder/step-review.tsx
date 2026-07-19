import type { Dispatch } from "react";
import Image from "next/image";
import { MessageCircle, Mail, Phone } from "lucide-react";
import { variantUrl, originalOnError } from "@/lib/utils/image-variants";
import { isValidIndianMobile, isValidEmail } from "@/lib/utils/form-validation";
import {
  buildWhatsAppUrl,
  buildEmailUrl,
  getOccasion,
  getPackagingTier,
  getPersonalisationLevel,
  getTimelineLabel,
  getBucketByCode,
  type KitAction,
  type KitBuilderState,
  type KitStringField,
} from "@/lib/gift-builder";

const HEARD_OPTIONS = ["LinkedIn", "Google", "Referral", "Event", "Other"];

export function StepReview({
  state,
  dispatch,
  onGoToStep,
  onBack,
}: {
  state: KitBuilderState;
  dispatch: Dispatch<KitAction>;
  onGoToStep: (index: number) => void;
  onBack: () => void;
}) {
  const occasion = getOccasion(state.occasion);
  const tier = getPackagingTier(state.packagingTier);
  const level = getPersonalisationLevel(state.personalisationLevel);
  const total = state.selectedProducts.length * state.quantity;

  const nameOk = state.contactName.trim().length > 0;
  const companyOk = state.contactCompany.trim().length > 0;
  const emailOk = isValidEmail(state.contactEmail);
  const phoneOk = isValidIndianMobile(state.contactPhone);
  const valid = nameOk && companyOk && emailOk && phoneOk;
  // Inline errors only once the user has typed something (don't shout on an empty pristine field).
  const emailError = state.contactEmail.trim() && !emailOk ? "Enter a valid email address." : undefined;
  const phoneError = state.contactPhone.trim() && !phoneOk ? "Enter a valid 10-digit Indian mobile (e.g. +91 90000 00000)." : undefined;

  /** Fire-and-forget lead capture - never blocks the WhatsApp/email handoff. */
  function captureLead() {
    try {
      const payload = {
        name: state.contactName.trim(),
        email: state.contactEmail.trim(),
        phone: state.contactPhone.trim(),
        company: state.contactCompany.trim(),
        occasion: state.occasion ?? undefined,
        products: state.selectedProducts.map((p) => ({
          sku: p.sku,
          name: p.name,
        })),
        source: "gift_builder",
      };
      void fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore - capture is best-effort
    }
  }

  const setField = (field: KitStringField, value: string) =>
    dispatch({ type: "SET_FIELD", field, value });

  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A]">
        Your Experience Kit - Ready to Enquire
      </h2>
      <p className="mt-2 text-[#666666]">
        Review your selections below. Our team will respond within 2 hours with a custom quote.
      </p>

      {/* Kit summary */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-[#EDE9E3] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-navy px-6 py-4">
          <span className="font-semibold text-cream">
            Experience Kit for {occasion?.label ?? "Custom"}
          </span>
          <span className="font-numbers rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy">
            {state.quantity} kits
          </span>
        </div>

        <div className="space-y-6 p-6">
          {/* Products */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1A1A1A]">
                Products ({state.selectedProducts.length})
              </h3>
              <button type="button" onClick={() => onGoToStep(1)} className="text-xs font-semibold text-gold hover:underline">
                Edit Products
              </button>
            </div>
            <ol className="space-y-2">
              {state.selectedProducts.map((p, i) => {
                const collection = getBucketByCode(p.bucket);
                return (
                  <li key={p.sku} className="flex items-center gap-3">
                    <span className="font-numbers w-5 text-sm text-[#999999]">{i + 1}</span>
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                      {p.imageUrl ? (
                        <Image src={variantUrl(p.imageUrl, "thumb")} alt="" fill unoptimized onError={originalOnError(p.imageUrl)} className="object-cover" sizes="64px" />
                      ) : (
                        <span className="flex size-full items-center justify-center bg-navy text-[10px] font-bold text-gold">
                          NV
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#1A1A1A]">{p.name}</span>
                      <span className="block truncate text-xs text-[#888888]">{collection?.name}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <SummaryRow label="Packaging" value={tier.name} detail={tier.description} onEdit={() => onGoToStep(2)} editLabel="Change Packaging" />
          <SummaryRow
            label="Personalisation"
            value={level.name}
            detail={state.sampleMessage ? `"${state.sampleMessage.slice(0, 120)}${state.sampleMessage.length > 120 ? "…" : ""}"` : undefined}
            onEdit={() => onGoToStep(3)}
            editLabel="Edit Personalisation"
          />
          <SummaryRow label="Timeline" value={getTimelineLabel(state.timeline)} onEdit={() => onGoToStep(3)} editLabel="Edit" />
          {state.specialInstructions.trim() ? (
            <SummaryRow label="Special Requirements" value={state.specialInstructions} onEdit={() => onGoToStep(3)} editLabel="Edit" />
          ) : null}

          <div className="border-t border-[#EDE9E3] pt-4">
            <p className="font-numbers text-sm text-[#555555]">
              {state.selectedProducts.length} products �- {state.quantity} kits ={" "}
              <span className="font-semibold text-navy">{total} total personalised items</span>
            </p>
          </div>
        </div>
      </div>

      {/* Contact form */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-[#1A1A1A]">Your Details</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name *" value={state.contactName} onChange={(v) => setField("contactName", v)} placeholder="Your name" />
          <Field label="Company *" value={state.contactCompany} onChange={(v) => setField("contactCompany", v)} placeholder="Company name" />
          <Field label="Email *" type="email" value={state.contactEmail} onChange={(v) => setField("contactEmail", v)} placeholder="you@company.com" error={emailError} />
          <Field label="Phone *" type="tel" value={state.contactPhone} onChange={(v) => setField("contactPhone", v)} placeholder="+91 90000 00000" error={phoneError} />
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A]">How did you hear about us?</label>
            <select
              value={state.heardAboutUs}
              onChange={(e) => setField("heardAboutUs", e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#EDE9E3] bg-white px-3 text-sm focus-visible:border-gold focus-visible:outline-none"
            >
              <option value="">Select (optional)</option>
              {HEARD_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-8 space-y-3">
        {valid ? (
          <a
            href={buildWhatsAppUrl(state)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={captureLead}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-4 text-lg font-semibold text-white transition-all hover:scale-[1.01] hover:bg-navy/90"
          >
            <MessageCircle className="size-5" /> Send Enquiry via WhatsApp
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-navy/40 py-4 text-lg font-semibold text-white"
          >
            <MessageCircle className="size-5" /> Send Enquiry via WhatsApp
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          {valid ? (
            <a
              href={buildEmailUrl(state)}
              onClick={captureLead}
              className="flex items-center justify-center gap-2 rounded-xl border border-navy py-3 text-sm font-semibold text-navy transition-colors hover:bg-secondary"
            >
              <Mail className="size-4" /> Send via Email
            </a>
          ) : (
            <button type="button" disabled className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#EDE9E3] py-3 text-sm font-semibold text-[#999999]">
              <Mail className="size-4" /> Send via Email
            </button>
          )}
          {valid ? (
            <a
              href="tel:+919019409590"
              className="flex items-center justify-center gap-2 rounded-xl border border-navy py-3 text-sm font-semibold text-navy transition-colors hover:bg-secondary"
            >
              <Phone className="size-4" /> Call to Discuss
            </a>
          ) : (
            <button type="button" disabled className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#EDE9E3] py-3 text-sm font-semibold text-[#999999]">
              <Phone className="size-4" /> Call to Discuss
            </button>
          )}
        </div>
        {!valid ? (
          <p className="text-xs text-destructive">Please fill in your name, company, a valid email, and phone to send the enquiry.</p>
        ) : null}
        <p className="text-xs leading-relaxed text-[#888888]">
          ✓ No commitment required · ✓ Custom quote within 2 hours · ✓ Free sample for orders 25+ · ✓
          We&apos;ll never share your details
        </p>
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 items-center rounded-full border border-[#EDE9E3] px-6 text-sm font-semibold text-navy transition-colors hover:bg-secondary"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  detail,
  onEdit,
  editLabel,
}: {
  label: string;
  value: string;
  detail?: string;
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <div className="border-t border-[#EDE9E3] pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#1A1A1A]">{label}</h3>
          <p className="mt-0.5 text-sm text-[#555555]">{value}</p>
          {detail ? <p className="mt-0.5 text-xs italic text-[#888888]">{detail}</p> : null}
        </div>
        <button type="button" onClick={onEdit} className="shrink-0 text-xs font-semibold text-gold hover:underline">
          {editLabel}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1A1A1A]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`mt-1.5 h-11 w-full rounded-xl border bg-white px-3 text-sm focus-visible:outline-none ${
          error ? "border-destructive focus-visible:border-destructive" : "border-[#EDE9E3] focus-visible:border-gold"
        }`}
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
