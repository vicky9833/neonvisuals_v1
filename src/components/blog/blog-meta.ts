import type { BlogCategory } from "@/lib/engines/blog";

export const CATEGORY_LABEL: Record<BlogCategory, string> = {
  insights: "Insights",
  guides: "Guides",
  product_spotlight: "Product Spotlight",
  culture: "Culture",
  case_study: "Case Study",
  seasonal: "Seasonal",
  industry: "Industry",
};

export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "insights", label: "Insights" },
  { value: "guides", label: "Guides" },
  { value: "product_spotlight", label: "Product Spotlight" },
  { value: "culture", label: "Culture" },
  { value: "case_study", label: "Case Study" },
  { value: "seasonal", label: "Seasonal" },
  { value: "industry", label: "Industry" },
];
