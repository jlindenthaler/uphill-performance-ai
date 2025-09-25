import { z } from 'zod'

// Password strength requirements
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

// Auth form validation schemas
export const signInSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must be less than 128 characters')
})

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
  password: passwordSchema
})

// Activity upload validation
export const activityUploadSchema = z.object({
  activityName: z
    .string()
    .trim()
    .max(100, 'Activity name must be less than 100 characters')
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
  cpTargetDuration: z
    .string()
    .regex(/^\d+$/, 'Duration must be a valid number')
    .transform(val => parseInt(val))
    .refine(val => val > 0 && val <= 3600, 'Duration must be between 1 and 3600 seconds')
    .optional()
})

// File upload validation
export const fileUploadSchema = z.object({
  files: z
    .array(z.instanceof(File))
    .min(1, 'At least one file is required')
    .max(10, 'Maximum 10 files allowed')
    .refine(
      files => files.every(file => file.size <= 20 * 1024 * 1024),
      'Each file must be less than 20MB'
    )
    .refine(
      files => files.every(file => 
        ['gpx', 'tcx', 'fit'].includes(file.name.split('.').pop()?.toLowerCase() || '')
      ),
      'Only GPX, TCX, and FIT files are allowed'
    )
})

// User profile validation
export const userProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
  timezone: z
    .string()
    .min(1, 'Timezone is required'),
  units: z
    .enum(['metric', 'imperial'], {
      errorMap: () => ({ message: 'Units must be either metric or imperial' })
    })
})

export type SignInFormData = z.infer<typeof signInSchema>
export type SignUpFormData = z.infer<typeof signUpSchema>
export type ActivityUploadFormData = z.infer<typeof activityUploadSchema>
export type UserProfileFormData = z.infer<typeof userProfileSchema>