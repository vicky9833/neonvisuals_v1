# Neon Visuals - Premium Gifting Studio

**Crafted with Intention. Remembered with Pride.**

Premium personalized gifting platform for corporates, colleges, events, startups,
and institutions across India. Occasion-first gifting, a visual kit builder, an
employee memory engine, and quote-based enterprise selling.

## Tech Stack

- Next.js 16 (App Router, TypeScript strict, Turbopack)
- React 19
- Tailwind CSS v4 + shadcn/ui
- Supabase (PostgreSQL, Auth, Storage, Realtime)
- Razorpay (Payments)
- Resend (Email)
- Zustand, React Hook Form + Zod, Recharts, @react-pdf/renderer

## Getting Started

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in the values
3. `npm install`
4. `npm run dev`

Open http://localhost:3000 to view the app.

## Scripts

- `npm run dev` - Start the development server
- `npm run build` - Production build
- `npm start` - Serve the production build
- `npm run lint` - Run ESLint
- `npm test` - Run the test suite (Vitest + fast-check)
- `npm run restructure-images` - Rebuild `product-images/` from `neonvisualsfinal/`
- `npm run upload-images` - Upload images to Supabase Storage
- `npm run generate-catalog` - Regenerate the product catalog from the image manifest

## Architecture

- `src/app/(marketing)/` - Public marketing pages (SEO, server components)
- `src/app/(auth)/` - Login, register, password reset
- `src/app/(dashboard)/` - Client portal (auth-protected)
- `src/app/(admin)/` - Internal admin panel (super_admin only)
- `src/lib/engines/` - Business logic (pricing, quotes, orders, billing, leads, blog)
- `src/lib/services/` - External integrations (Razorpay, Resend, storage)
- `src/lib/supabase/` - Supabase clients (browser, server, admin)
- `src/data/` - Generated static catalog + seed content

Route protection is enforced in `proxy.ts` (Next.js 16 replaces middleware with
proxy). Multi-tenancy is enforced at the database level via Supabase RLS.

## Deployment

Deployed on Vercel at [neonvisuals.in](https://neonvisuals.in). Set the required
environment variables (see `.env.example`) in the Vercel project settings before
deploying.
