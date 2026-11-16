import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface UserTokenPayload {
  sub: string;
  email: string;
  name: string;
}

export const signAccessToken = (payload: UserTokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

export const signRefreshToken = (payload: UserTokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

export const verifyAccessToken = (token: string): UserTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as UserTokenPayload;
};

export const verifyRefreshToken = (token: string): UserTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as UserTokenPayload;
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
