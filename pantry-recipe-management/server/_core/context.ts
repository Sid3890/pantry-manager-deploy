import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures; protected procedures reject user = null
    user = null;
  }

  // In local development or standalone mode (when DATABASE_URL is not set or in dev),
  // provide a default dev session so local test procedures are not blocked by 401 Unauthorized
  if (!user && (process.env.NODE_ENV !== "production" || !process.env.DATABASE_URL)) {
    user = {
      id: 1,
      openId: "dev-user-local",
      name: "Chef Alex",
      email: "alex@kitchen.local",
      passwordHash: null,
      loginMethod: "local",
      role: "user",
      cookingLevel: "INTERMEDIATE",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
