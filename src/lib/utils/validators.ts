import { z } from "zod";

/** Zod schemas for validating input at API boundaries. */

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email is required"),
  company: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

export const leadSchema = z.object({
  company: z.string().min(1, "Company is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email is required"),
  phone: z.string().optional(),
  occasion: z.string().optional(),
  employeeCount: z.coerce.number().int().positive().optional(),
  message: z.string().optional(),
});

export const employeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  joiningDate: z.string().optional(),
  birthday: z.string().optional(),
  hometown: z.string().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
