import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { prisma } from '../utils/prisma';
import { generateToken, setTokenCookie, clearTokenCookie } from '../utils/auth';

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['PLAYER', 'OWNER']).default('PLAYER'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, role } = registerSchema.parse(req.body);

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return next(new AppError('Email already registered', 400));
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role,
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    setTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user,
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Account deactivated. Contact support.', 403));
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return next(new AppError('Invalid credentials', 401));
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    setTokenCookie(res, token);

    res.json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  clearTokenCookie(res);
  res.json({ success: true, message: 'Logged out' });
};

export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        playerProfile: true,
        ownedCourts: { select: { id: true, name: true, city: true } },
      },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};