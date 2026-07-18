-- Prompt P-fixpass (#3): assign a DISTINCT hero/og cover per published blog post.
--
-- Migration 017 re-pointed all posts into product-images but mapped 12 posts onto only ~5 shared
-- images (repetitive). The bucket has 1533 objects; ≥12 distinct suitable covers exist. This assigns
-- one distinct, verified in-bucket premium image per published post (keyed by slug), so each card /
-- detail hero is visually unique. Every URL below was existence-checked against storage.objects.
-- Idempotent: keyed by exact slug; a second run sets the same values (no-op). No schema change.

do $$
declare base text := 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/';
declare m record;
begin
  for m in
    select * from (values
      ('gift-saves-replacement-cost',                 'ceo-leadership/curate-box-giftnote/curated-box-giftnote-set-2/curated-box-gift-1.jpg'),
      ('resume-intelligence-gifting-future',          'ceo-leadership/brass-desk-globe-name-base/brass-desk-globe-name-base-1.jpeg'),
      ('recipient-name-before-company-logo',          'onboarding/backpack/embroiderry-logo-print-bags/embroidered-logo-print-bags-2.png'),
      ('work-anniversary-gift-ideas-desk-test',       'milestone/five-year/crystal-award-with-name-and-date/personalised-crystal-award-set-1/personalized-employee-crystal-awards-1.webp'),
      ('cfo-guide-employee-recognition-roi',          'onboarding/copper-bottle/copper-bottletumbler/copper-bottle-with-tumbler-1.png'),
      ('apple-packaging-corporate-gifts',             'all-kits/curated-gift-box.png'),
      ('indian-copper-craftsmanship-moradabad',       'onboarding/copper-bottle/antique-copper-bottle/antique-copper-bottle-1.png'),
      ('bangalore-corporate-gifting-guide',           'all-kits/premium-client-hamper.png'),
      ('personalised-recognition-reduces-attrition',  'onboarding/copper-bottle/hammered-copper-bottle/hammered-copper-bottle-1.png'),
      ('employee-onboarding-kit-ideas',               'onboarding/backpack/logo-print-backpack/logo-print-backpack-1.png'),
      ('true-cost-of-generic-corporate-gifts',        'sustainability/beeswax-wrap-set-3-pcs/beeswax-wrap-set-1/set-of-3-beeswax-food-wrap-1.webp'),
      ('why-diwali-gifts-are-forgettable',            'festive/diwali-brass-diya-set/brass-diya-set/brass-diya1.jpeg')
    ) as t(slug, path)
  loop
    update public.blog_posts
      set hero_image_url = base || m.path,
          og_image_url   = base || m.path
      where slug = m.slug and status = 'published';
  end loop;
end $$;
