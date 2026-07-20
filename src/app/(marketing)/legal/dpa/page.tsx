import type { Metadata } from "next";
import { buildMetadata } from "@/lib/utils/seo";
import { LegalContent } from "@/components/marketing/legal-content";

export const metadata: Metadata = buildMetadata({
  title: "Data Processing Agreement (DPA)",
  description:
    "How Neon Visuals processes employee data on behalf of business customers under the DPDP Act — roles, security, sub-processors, retention, and breach handling.",
  path: "/legal/dpa",
});

const LAST_UPDATED = "15 June 2026";

const DPA = `**Last updated: ${LAST_UPDATED}**

This Data Processing Agreement ("**DPA**") forms part of, and is incorporated into, the Terms & Conditions between **Neon Visuals** — a sole proprietorship owned by **Vikas Vishwakarma**, with its principal place of business at Room No. 20, Vishwakarma Rahiwashi Sangh, Jogeshwari Vikhroli Link Road, Andheri East, Mumbai, Maharashtra – 400093, GSTIN 27BZSPV5411Q1ZA ("**Neon Visuals**", "**we**", "**us**", "**Processor**") — and the business customer that uses our platform (the "**Client**", "**you**", "**Data Fiduciary**").

It governs our processing of personal data relating to your employees and gift recipients ("**Employee Data**") that you provide to, or generate within, the Neon Visuals platform.

## 1. Roles of the parties

- **You are the Data Fiduciary.** You determine why and how your employees' personal data is processed. You are responsible for having a lawful basis to provide that data to us and for giving your employees any notice required by law.
- **We are the Data Processor.** We process Employee Data only on your documented instructions and on your behalf, to provide the recognition and gifting services — never for our own purposes.

By accepting this DPA and confirming at sign-up that you are authorised to share your employees' data and have given them the required notice, you instruct us to process Employee Data as described here.

## 2. Scope and purpose of processing

- **Subject matter:** provision of the Neon Visuals recognition platform and gifting fulfilment.
- **Duration:** for as long as your account is active, plus the limited retention described in Section 7.
- **Nature and purpose:** storing employee records; generating recognition occasions and reminders; preparing, personalising, and delivering gifts; and maintaining gifting history.
- **Categories of data subjects:** your employees and designated gift recipients.
- **Categories of Employee Data:** names, work contact details, department, delivery address, phone number, and day/month of birth (never birth year). We do not require or request special-category data, and you agree not to upload it.

## 3. Our obligations as Processor

We will:

- process Employee Data **only on your documented instructions** (including via your use of the platform), unless required otherwise by law, in which case we will inform you where permitted;
- ensure that persons authorised to process Employee Data are bound by confidentiality;
- implement the **technical and organisational security measures** described in Section 4;
- assist you, so far as reasonably possible, in responding to requests from data principals (your employees) and in meeting your own obligations under the DPDP Act;
- make available information reasonably necessary to demonstrate compliance with this DPA;
- **not process Employee Data for our own purposes**, and never sell it.

## 4. Security measures

We protect Employee Data with measures including:

- **Encryption** of sensitive fields (phone numbers and delivery addresses) using strong, industry-standard encryption (AES-256-GCM);
- **Role-based access control** and database-level row security, so users and staff see only the data they are authorised to see; sensitive details are hidden from roles that do not require them;
- **Data minimisation in logs and communications** — personal data is not placed in system logs, web addresses, or email subject lines;
- an **immutable audit trail** of sensitive actions that records the action without recording the personal data itself;
- controls on file uploads, including validation and malware scanning of attachments.

## 5. Sub-processors

You authorise us to engage the following sub-processors, each bound to protect Employee Data and to process it only as needed to provide their service to us:

- **Razorpay** — payment and subscription processing.
- **Supabase** — database and secure file storage.
- **Resend** — transactional and service email delivery.
- **Vercel** — application and website hosting.

Some sub-processors may store or process data on infrastructure located outside India; we take reasonable steps to ensure such transfers are consistent with the DPDP Act. We will give you reasonable notice of any intended addition or replacement of a sub-processor, giving you the opportunity to object on reasonable data-protection grounds.

## 6. Data principal rights and assistance

Because your employees' data is controlled by you, requests from an employee to access, correct, or erase their data should be directed to you. We will provide reasonable assistance — including the platform tools needed — to help you fulfil such requests and to meet your obligations under the DPDP Act.

## 7. Retention and deletion

- We retain Employee Data only as long as necessary to provide the services or as required by law.
- When you off-board an employee, that employee's sensitive personal data is scheduled for **secure deletion after a defined retention window (currently 90 days)**. Aggregate, non-identifying records may be retained.
- On termination of your account, we will, at your choice and within a reasonable period, delete or return Employee Data, save where retention is required by law.

## 8. Personal data breach

We will notify you **without undue delay** after becoming aware of a personal data breach affecting your Employee Data, and will provide the information reasonably available to help you meet your own notification obligations under the DPDP Act. Notifications will be sent to your registered account contact and to **contact@neonvisuals.in** correspondents.

## 9. Liability and general

- This DPA is governed by the laws of India; the courts at Mumbai, Maharashtra have exclusive jurisdiction, subject to applicable law.
- Where this DPA conflicts with the Terms & Conditions on the subject of data processing, this DPA prevails.
- We may update this DPA to reflect changes in law or our processing; the current version will be posted with a revised date, and material changes communicated where required.

## 10. Contact

Data-processing matters, data requests, and breach correspondence:
**Neon Visuals** — **contact@neonvisuals.in** — +91 98334 50699`;

export default function DpaPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-serif text-4xl text-navy">Data Processing Agreement</h1>
      <LegalContent markdown={DPA} />
    </div>
  );
}
