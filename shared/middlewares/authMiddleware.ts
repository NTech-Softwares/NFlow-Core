import jwt from "jsonwebtoken";

import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn("Tentativa de acesso: Token missing");
    return res.status(401).json({
      error: "Token missing",
    });
  }

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    logger.warn("Tentativa de acesso: Invalid token format");
    return res.status(401).json({
      error: "Invalid token format",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    req.user = decoded;

    next();
  } catch (error) {
    logger.error("Tentativa de acesso: Invalid token");
    return res.status(401).json({
      error: "Invalid token",
    });
  }
}
