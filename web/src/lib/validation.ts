import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Stellar public keys (StrKey ed25519) are 'G' + 55 base32 chars (A–Z, 2–7).
export const stellarAddress = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, 'Invalid Stellar address');

export const updateProfileSchema = z.object({
  // null clears the link (unlink); a string sets it.
  walletAddress: stellarAddress.nullable(),
});

// --- Artworks ---
export const createArtworkSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
});

export const updateArtworkSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((d) => d.title !== undefined || d.description !== undefined, {
    message: 'Nothing to update',
  });

export const publishSchema = z
  .object({
    isFree: z.boolean().default(false),
    // Price in XLM.
    price: z.number().positive().max(1_000_000).optional(),
  })
  .refine((d) => d.isFree || typeof d.price === 'number', {
    message: 'Set a price or mark it free',
    path: ['price'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
