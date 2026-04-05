/**
 * VALIDATION SCHEMAS (validations.ts)
 * ----------------------------------
 * Functionality: Defines the "rules" for all data entered into the system.
 * Connection: Used by both the Frontend (forms) and Backend (actions) to ensure data safety.
 */
import { z } from 'zod';

const emailDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || '';

const emailValidator = (email: string) => {
  if (!emailDomain) return true;
  return email.toLowerCase().endsWith(`@${emailDomain}`);
};

const emailMessage = emailDomain
  ? `Only @${emailDomain} email addresses are allowed`
  : 'Please enter a valid email address';

/**
 * LOGIN VALIDATION
 * Functionality: Ensures email is valid and password meet length requirements.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .refine(emailValidator, emailMessage),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * REGISTRATION VALIDATION
 * Functionality: Checks for matching passwords and required fields for new accounts.
 */
export const registerSchema = z
  .object({
    email: z
      .string()
      .email('Please enter a valid email address')
      .refine(emailValidator, emailMessage),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    fullName: z.string().min(2, 'Full name is required'),
    department: z.string().optional(),
    contactNumber: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * EQUIPMENT VALIDATION
 * Functionality: Ensures equipment names, quantities, and statuses are correctly formatted.
 */
export const equipmentSchema = z.object({
  name: z.string().min(1, 'Equipment name is required'),
  category_id: z.string().uuid('Please select a category').optional().nullable(),
  description: z.string().optional(),
  total_quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  status: z.enum(['available', 'maintenance', 'unavailable']).default('available'),
  condition: z.enum(['excellent', 'good', 'fair', 'poor', 'damaged']).default('good'),
  serial_number: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * BOOKING VALIDATION
 * Functionality: Ensures all required reservation fields are present and return date is logical.
 */
export const bookingSchema = z
  .object({
    equipment_id: z.string().uuid('Please select equipment'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
    borrower_name: z.string().min(2, 'Borrower name is required'),
    borrower_email: z
      .string()
      .email('Please enter a valid email'),
    department: z.string().optional(),
    purpose: z.string().min(5, 'Please describe the purpose (min 5 chars)'),
    borrow_date: z.string().min(1, 'Borrow date is required'),
    return_date: z.string().min(1, 'Return date is required'),
  })
  .refine(
    (data) => new Date(data.return_date) > new Date(data.borrow_date),
    {
      message: 'Return date must be after borrow date',
      path: ['return_date'],
    }
  );

/**
 * DAMAGE REPORT VALIDATION
 * Functionality: Ensures reports of broken equipment have enough detail.
 */
export const damageReportSchema = z.object({
  booking_id: z.string().uuid(),
  equipment_id: z.string().uuid(),
  description: z.string().min(10, 'Please provide a detailed description'),
  severity: z.enum(['minor', 'moderate', 'severe']),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type EquipmentInput = z.infer<typeof equipmentSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type DamageReportInput = z.infer<typeof damageReportSchema>;
