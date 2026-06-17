/** Employee and EIGS archetype domain types. */

export type ArchetypeName =
  | "Achiever"
  | "Creator"
  | "Explorer"
  | "Builder"
  | "Root"
  | "Connector"
  | "Scholar"
  | "Minimalist";

export interface Employee {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  role?: string;
  department?: string;
  joiningDate?: string;
  birthday?: string;
  hometown?: string;
  interests?: string[];
  archetype?: ArchetypeName;
  /** Free-text note from the manager to acknowledge. */
  acknowledgement?: string;
}

export interface EmployeeBrief {
  name: string;
  joiningDate?: string;
  role?: string;
  department?: string;
  interests?: string[];
  hometown?: string;
  acknowledgement?: string;
}
