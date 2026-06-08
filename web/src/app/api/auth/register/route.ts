import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { apiError, publicUser, readJson } from '@/lib/api';

export const runtime = 'nodejs';

// POST /api/auth/register — create an account with email + password (bcrypt).
export async function POST(req: Request) {
  const body = await readJson(req);
  if (body === null) return apiError('Invalid JSON body', 400);

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Validation failed', 422, parsed.error.flatten().fieldErrors);
  }
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return apiError('Email already registered', 409);

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password), name: name ?? null },
  });

  return NextResponse.json({ user: publicUser(user) }, { status: 201 });
}
