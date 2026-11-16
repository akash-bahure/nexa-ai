import type { RequestHandler, Response } from "express";
import { env } from "../config/env.js";
import { AppError } from "../middleware/error.middleware.js";
import {
  registerSchema,
  loginSchema,
} from "../validators/auth.validator.js";
import {
  registerUser,
  loginUser,
  refreshUserSession,
  revokeUserRefreshToken,
  getUserProfile,
} from "../services/auth.service.js";

const COOKIE_NAME = "refreshToken";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/api/v1/auth",
    maxAge: COOKIE_MAX_AGE,
  });
};

const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/api/v1/auth",
  });
};

export const register: RequestHandler = async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);

    const { user, accessToken, refreshToken } = await registerUser(input);

    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);

    const { user, accessToken, refreshToken } = await loginUser(input);

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[COOKIE_NAME] as string | undefined;

    if (!rawRefreshToken) {
      throw new AppError(401, "No active session found");
    }

    const { user, accessToken, refreshToken } = await refreshUserSession(
      rawRefreshToken
    );

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    clearRefreshTokenCookie(res);
    next(error);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[COOKIE_NAME] as string | undefined;

    if (rawRefreshToken) {
      await revokeUserRefreshToken(rawRefreshToken);
    }

    clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getMe: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, "Unauthorized");
    }

    const user = await getUserProfile(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
