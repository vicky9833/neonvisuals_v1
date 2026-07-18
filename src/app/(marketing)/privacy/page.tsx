import type { Metadata } from "next";
import { buildMetadata } from "@/lib/utils/seo";
import { LegalContent } from "@/components/marketing/legal-content";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "How Neon Visuals collects, uses, and protects your information across our personalized gifting experiences.",
  path: "/privacy",
});

// P-fixpass #6: approved Privacy Policy copy (DPDP-aligned). Bracketed legal-entity fields
// ([PROPRIETOR LEGAL NAME], [PRINCIPAL PLACE OF BUSINESS ADDRESS], [DATE]) are placeholders the
// founder finalises with counsel before this is treated as production-final.
const PRIVACY = `**Last updated: [DATE]**

Neon Visuals ("**Neon Visuals**", "**we**", "**us**", or "**our**") is a sole proprietorship owned by **[PROPRIETOR LEGAL NAME]**, with its principal place of business at **[PRINCIPAL PLACE OF BUSINESS ADDRESS, INDIA]**. We provide a premium corporate-gifting service and a workforce-recognition software platform to businesses and institutions across India.

We take the privacy of personal data seriously. This policy explains what personal data we collect, why we collect it, how we protect it, and the rights available to you under applicable Indian law, including the DPDP Act.

By using our website (www.neonvisuals.in), creating an account, or engaging our services, you acknowledge that you have read and understood this policy.

## 1. The two roles in which we handle data

- **Data we control (we are the Data Fiduciary).** When you visit our website, sign up for an account, contact us, request a quote, or subscribe to a paid plan, we determine why and how your personal data is processed. For this data, we are the Data Fiduciary.
- **Data we process on behalf of our business customers (we are a Data Processor).** When a company or institution uses our platform to manage gifting for their own staff, they upload personal data about their employees (such as names and delivery details). That employer is the Data Fiduciary for their employees' data; we process it strictly on their instructions and on their behalf. If you are an employee of one of our business customers and have questions about your data, please contact your employer, who controls it.

## 2. Personal data we collect

- **Account and contact data:** name, work email address, phone number, company name, role, and login credentials.
- **Business and transaction data:** quote requests, orders, gifting preferences, subscription and billing records, and correspondence with us.
- **Employee recipient data (processed on behalf of our business customers):** recipient names, work contact details, delivery address, phone number, and day/month of birth (we do **not** collect birth year).
- **Payment data:** processed securely by our payment partner. We do not store full card or bank details on our systems.
- **Technical data:** limited device/browser information and interaction logs, used to operate and secure the service. We do not place personal data in logs, URLs, or email subject lines.

## 3. Why we process personal data

We process personal data only for lawful, specific purposes, including to: create and manage accounts and provide the platform's features; prepare quotes, fulfil orders, and personalise and deliver gifts; process subscriptions, payments, and issue GST-compliant invoices; send transactional and service communications; provide customer support; operate, secure, and improve our service; and comply with legal, tax, and regulatory obligations.

Where we rely on your consent (for example, marketing communications), you may withdraw it at any time. Withdrawing consent does not affect processing already carried out, or processing necessary to provide a service you have requested or to meet a legal obligation.

## 4. How we protect personal data

- **Encryption of sensitive fields.** Sensitive recipient data, including phone numbers and delivery addresses, is encrypted using strong, industry-standard encryption (AES-256-GCM) so that it is not readable at rest without authorised access.
- **Strict access controls.** Access to personal data is governed by role-based permissions and database-level row security, so users and staff can only see the data they are authorised to see.
- **Data minimisation in logs and communications.** Personal data does not appear in system logs, web addresses, or email subject lines.
- **An immutable audit trail** of sensitive actions, without recording the personal data itself.

No system can be guaranteed perfectly secure, but we work continuously to protect data using appropriate technical and organisational safeguards.

## 5. Who we share data with

We do not sell personal data. We share data only where necessary to run our service, with trusted partners bound to protect it: **Razorpay** (payments), **Supabase** (database + secure storage), **Resend** (transactional email), and **Vercel** (hosting). Some providers may store or process data on infrastructure outside India; we take reasonable steps to ensure such transfers are consistent with the DPDP Act. We may also disclose data where required by law.

## 6. How long we keep data

We keep personal data only as long as necessary for the purposes described above or as required by law. For recipient data processed on behalf of our business customers, once an employee is off-boarded by their employer, their sensitive personal data is scheduled for secure deletion after a defined retention window (currently 90 days). Aggregate, non-identifying records may be retained.

## 7. Your rights

Subject to applicable law, and in particular the DPDP Act, you have the right to: **access** the personal data we hold about you; **correct or update** inaccurate data; **request erasure** where it is no longer required; **withdraw consent** where processing is based on consent; **nominate** another individual to exercise your rights; and **raise a grievance** with us.

If you are an employee of one of our business customers, please direct requests about your recipient data to your employer, who controls that data. To exercise any right, contact us at **contact@neonvisuals.in**. We may need to verify your identity before acting on a request.

## 8. Children's data

Our service is intended for businesses and their authorised representatives, and is not directed at children. We do not knowingly collect personal data of children (individuals under 18) without verifiable parental or guardian consent as required by the DPDP Act.

## 9. Grievance redressal

If you have any concern or complaint about how your personal data is handled, please contact **contact@neonvisuals.in**. We will acknowledge and address grievances within the timelines prescribed under the DPDP Act and its rules. If you are not satisfied with our response, you may have the right to escalate to the Data Protection Board of India.

## 10. Changes to this policy

We may update this policy from time to time to reflect changes in our practices or the law. We will post the updated version here with a revised "Last updated" date.

## 11. Contact us

**Neon Visuals** · Email: **contact@neonvisuals.in** · Phone: +91 90194 09590 · Studios: Bengaluru, Karnataka & Mumbai, Maharashtra`;

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-serif text-4xl text-navy">Privacy Policy</h1>
      <LegalContent markdown={PRIVACY} />
    </div>
  );
}
