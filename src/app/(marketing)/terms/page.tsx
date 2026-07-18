import type { Metadata } from "next";
import { buildMetadata } from "@/lib/utils/seo";
import { LegalContent } from "@/components/marketing/legal-content";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Conditions",
  description:
    "The terms and conditions that govern your use of Neon Visuals' personalized gifting services.",
  path: "/terms",
});

// Legal-copy finalization: published Terms with PUBLIC-SAFE particulars only. Full street address +
// personal mobile from the source doc are intentionally redacted to "Mumbai, Maharashtra" and the
// contact email (they live in internal records / GST invoices only). "Last updated" is a clearly-
// editable field (no invented date); founder edits LAST_UPDATED on publish.
const LAST_UPDATED = "to be set on publication";
const TERMS = `**Last updated: ${LAST_UPDATED}**

These Terms & Conditions ("**Terms**") govern your access to and use of the website, platform, and services provided by **Neon Visuals**, a sole proprietorship (constitution: proprietorship) owned by **Vikas Vishwakarma** ("**Neon Visuals**", "**we**", "**us**", "**our**"), trading as **Neon Visuals**, GSTIN **27BZSPV5411Q1ZA**, Udyam **UDYAM-MH-18-0340367**, with its principal place of business in **Mumbai, Maharashtra**.

By accessing our website, creating an account, requesting a quote, placing an order, or subscribing to a paid plan, you agree to these Terms. If you do not agree, please do not use our services.

## 1. About our services

Neon Visuals provides a **corporate gifting service** (sourcing, personalising, and delivering premium gifts for businesses and institutions) and a **workforce-recognition software platform** (tools to help organisations manage occasions, recognition, and gifting, on a free tier and a paid "Pro" subscription). We serve business and institutional customers across India.

## 2. Eligibility and accounts

- Our services are intended for **businesses and their authorised representatives**. By using them, you confirm you are at least 18 years old and authorised to act on behalf of the organisation you represent.
- You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.
- You agree to provide accurate, current, and complete information and to keep it updated.
- You are responsible for ensuring that anyone you invite to your organisation's account uses it in accordance with these Terms.

## 3. Quotes, orders, and minimum order quantity

- Quotes are provided on request and are **indicative** until confirmed by us in writing. A binding order arises only once we accept and confirm it.
- A **minimum order quantity** applies (currently from 10 units per order) and may vary by product.
- Product images and descriptions are for illustration; handcrafted and personalised items may vary slightly.
- We may decline or cancel an order where we are unable to fulfil it, where information is inaccurate, or where we suspect misuse, fraud, or a breach of these Terms.

## 4. Personalisation, logos, and intellectual property

- Where you provide logos, artwork, names, or other content for personalisation, you confirm that you own or are licensed to use that content and that its use does not infringe any third party's rights. You grant us the limited right to use it solely to fulfil your order.
- You are responsible for the accuracy of personalisation details (spellings, names, quantities). We will produce to the details you approve.
- All rights in our platform, website, designs, and content remain with Neon Visuals. Nothing in these Terms transfers our intellectual property to you.

## 5. Pricing, payments, and GST

- Prices for gifting are as stated in the applicable quote or order confirmation.
- The Pro software subscription is offered at **₹1,999 per year per organisation (inclusive of GST)**, billed annually, and covers your organisation's use of Pro features as described at the time of purchase.
- Payments are processed securely through our payment partner, **Razorpay**. By making a payment, you also agree to the payment provider's applicable terms.
- We issue **GST-compliant tax invoices** for payments. All applicable taxes are charged as required by law.

## 6. Subscription, renewal, and non-payment

- The Pro subscription runs for an **annual term** and is renewed by placing a further payment; it is not an automatically recurring charge unless expressly stated at purchase.
- If a subscription lapses or a renewal is not completed, Pro features may become unavailable after a short grace period. **Your existing data is not deleted because a subscription lapses** — you retain access to your records, but actions reserved for the Pro tier may be restricted until the subscription is renewed.
- Free-tier usage remains subject to the limits described on our website.

## 7. Cancellation and refunds

- Because gifts are **personalised and made to order**, orders generally cannot be cancelled or refunded once production has begun, except where an item is defective or not as agreed. Any cancellation before production is subject to our confirmation.
- Subscription fees are generally non-refundable except where required by law. If you believe you have been charged in error, contact us at **contact@neonvisuals.in** and we will review it in good faith.
- Where a gift arrives damaged or materially not as agreed, contact us promptly and we will work with you on a suitable resolution (repair, replacement, or credit).

## 8. Delivery

- We deliver across India (PAN-India). Delivery timelines shown are **estimates** and may be affected by personalisation complexity, logistics, and factors beyond our control.
- Risk in the goods passes on delivery to the address you provide. Please ensure delivery details are accurate; we are not responsible for failed delivery due to incorrect information.

## 9. Acceptable use

You agree not to: use the services for any unlawful purpose or in breach of any applicable law; upload content you are not authorised to use, or that is unlawful, infringing, or harmful; attempt to gain unauthorised access to the platform, other accounts, or our systems; interfere with or disrupt the integrity or performance of the services; or misuse personal data of any individual accessed through the platform.

## 10. Data protection

Our handling of personal data is described in our **Privacy Policy**, which forms part of these Terms. If you upload data about your employees or recipients, you confirm you have the necessary rights and consents to do so and that you act as the data fiduciary for that data.

## 11. Limitation of liability

- We provide our services with reasonable skill and care, but to the maximum extent permitted by law, our services are provided "as is" without further warranties.
- To the maximum extent permitted by law, our total liability to you arising out of or in connection with the services shall not exceed the amount paid by you to us for the specific order or subscription giving rise to the claim.
- We are not liable for indirect, incidental, or consequential losses, or for delays or failures caused by events beyond our reasonable control.

Nothing in these Terms excludes liability that cannot be excluded under applicable law.

## 12. Suspension and termination

We may suspend or terminate access where you breach these Terms, where required by law, or to protect our services or other users. You may stop using the services at any time. Provisions that by their nature should survive termination (including payment obligations, intellectual property, and limitation of liability) will survive.

## 13. Governing law and jurisdiction

These Terms are governed by the laws of India. The courts at **Mumbai, Maharashtra** shall have exclusive jurisdiction over any disputes, subject to applicable law.

## 14. Changes to these Terms

We may update these Terms from time to time. The current version will always be posted here with a revised "Last updated" date. Continued use of the services after changes take effect constitutes acceptance of the updated Terms.

## 15. Contact

**Neon Visuals** · Email: **contact@neonvisuals.in** · Mumbai, Maharashtra`;

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-serif text-4xl text-navy">Terms &amp; Conditions</h1>
      <LegalContent markdown={TERMS} />
    </div>
  );
}
