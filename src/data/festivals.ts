/** Indian festival calendar used for automated occasion reminders. */
export interface Festival {
  name: string;
  slug: string;
  /** Approximate calendar month (1–12); exact dates vary yearly. */
  month: number;
  region?: string;
}

export const FESTIVALS: readonly Festival[] = [
  { name: "Pongal", slug: "pongal", month: 1, region: "South India" },
  { name: "Holi", slug: "holi", month: 3 },
  { name: "Eid", slug: "eid", month: 4 },
  { name: "Raksha Bandhan", slug: "raksha-bandhan", month: 8 },
  { name: "Diwali", slug: "diwali", month: 10 },
  { name: "Christmas", slug: "christmas", month: 12 },
  { name: "New Year", slug: "new-year", month: 12 },
] as const;
