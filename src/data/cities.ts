/** Serviceable cities and Bangalore corridors for local SEO + delivery. */
export interface City {
  name: string;
  slug: string;
  state: string;
  /** True for the founding/primary market. */
  primary?: boolean;
}

export const CITIES: readonly City[] = [
  { name: "Bangalore", slug: "bangalore", state: "Karnataka", primary: true },
  { name: "Mumbai", slug: "mumbai", state: "Maharashtra" },
  { name: "Delhi NCR", slug: "delhi-ncr", state: "Delhi" },
  { name: "Hyderabad", slug: "hyderabad", state: "Telangana" },
  { name: "Pune", slug: "pune", state: "Maharashtra" },
  { name: "Chennai", slug: "chennai", state: "Tamil Nadu" },
  { name: "Gurugram", slug: "gurugram", state: "Haryana" },
] as const;
