# Code Standards

## TypeScript

- strict mode always, no 'any' type ever, use 'unknown' and narrow
- Prefer interfaces for object shapes, Zod for runtime validation at API boundaries

## React / Next.js

- Server Components by default, 'use client' only when needed
- Suspense boundaries with branded loading skeletons
- next/image for ALL images (width, height, alt text required)
- next/link for all internal navigation

## Styling

- Tailwind utility classes only — no custom CSS unless impossible otherwise
- shadcn/ui as component base, customise via className prop
- Mobile-first responsive (sm:, md:, lg:, xl:)
- CSS variables for brand colors defined in globals.css

## API Routes

- Zod validation on all inputs
- Consistent response shape: { data } or { error, message }
- Check auth for protected routes, RLS as second defense layer

## SEO (EVERY PAGE — NO EXCEPTIONS)

- Unique title + meta description
- Open Graph (og:title, og:description, og:image) + Twitter cards
- Canonical URL
- Semantic HTML (article, section, nav, proper H1→H2→H3 hierarchy)
- JSON-LD structured data (Product, FAQ, BreadcrumbList, Organization, Article)
- Alt text on every image
- Internal links to related pages
- FAQ sections with FAQ schema on all occasion and product pages
