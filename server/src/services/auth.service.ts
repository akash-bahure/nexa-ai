import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/error.middleware.js";
import { hashPassword, comparePassword } from "../utils/password.util.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../utils/jwt.util.js";
import type { RegisterInput, LoginInput } from "../validators/auth.validator.js";

const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const createSessionTokens = async (user: {
  id: string;
  email: string;
  name: string;
}) => {
  const tokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
  };

  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    },
  });

  return { accessToken, refreshToken };
};

export const registerUser = async (input: RegisterInput) => {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new AppError(409, "An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const tokens = await createSessionTokens(user);

  return {
    user,
    ...tokens,
  };
};

export const loginUser = async (input: LoginInput) => {
  const normalizedEmail = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const isPasswordValid = await comparePassword(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password");
  }

  const userProfile = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const tokens = await createSessionTokens(userProfile);

  return {
    user: userProfile,
    ...tokens,
  };
};

export const refreshUserSession = async (rawRefreshToken: string) => {
  if (!rawRefreshToken) {
    throw new AppError(401, "Refresh token is required");
  }

  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch (_err) {
    throw new AppError(401, "Invalid or expired session. Please log in again");
  }

  const tokenHash = hashToken(rawRefreshToken);

  const existingToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!existingToken || existingToken.revokedAt || existingToken.expiresAt < new Date()) {
    throw new AppError(401, "Session has expired or is invalid. Please log in again");
  }

  // Revoke previous refresh token (Token Rotation)
  await prisma.refreshToken.update({
    where: { id: existingToken.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await createSessionTokens(existingToken.user);

  return {
    user: existingToken.user,
    ...tokens,
  };
};

export const revokeUserRefreshToken = async (rawRefreshToken?: string) => {
  if (!rawRefreshToken) return;

  const tokenHash = hashToken(rawRefreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};
