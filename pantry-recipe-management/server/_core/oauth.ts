import crypto from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const GOOGLE_STATE_COOKIE = "google_oauth_state";
const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const GOOGLE_SCOPES = ["openid", "profile", "email"].join(" ");

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;
  const forwarded = req.headers["x-forwarded-proto"];
  return typeof forwarded === "string" && forwarded.split(",").some(value => value.trim() === "https");
}

function getRedirectUri(req: Request) {
  if (ENV.googleRedirectUri) return ENV.googleRedirectUri;
  const protocol = isSecureRequest(req) ? "https" : "http";
  return `${protocol}://${req.get("host")}/api/oauth/google/callback`;
}

function requireGoogleConfig(res: Response) {
  if (!ENV.googleClientId || !ENV.googleClientSecret) {
    res.status(503).json({ error: "Google OAuth is not configured on the server" });
    return false;
  }
  return true;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/google", (req: Request, res: Response) => {
    if (!requireGoogleConfig(res)) return;

    const state = crypto.randomBytes(32).toString("base64url");
    const nonce = crypto.randomBytes(32).toString("base64url");
    const redirectUri = getRedirectUri(req);
    const stateCookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: isSecureRequest(req),
      path: "/",
      maxAge: 10 * 60 * 1000,
    };

    res.cookie(GOOGLE_STATE_COOKIE, JSON.stringify({ state, nonce }), stateCookieOptions);

    const authorizationUrl = new URL(GOOGLE_AUTH_ENDPOINT);
    authorizationUrl.search = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      state,
      nonce,
      prompt: "select_account",
    }).toString();

    res.redirect(302, authorizationUrl.toString());
  });

  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const oauthError = typeof req.query.error === "string" ? req.query.error : undefined;
    const stateCookie = parseCookieHeader(req.headers.cookie ?? "")[GOOGLE_STATE_COOKIE];

    res.clearCookie(GOOGLE_STATE_COOKIE, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(req),
      path: "/",
    });

    if (oauthError) {
      res.redirect(302, `/?authError=${encodeURIComponent(oauthError)}`);
      return;
    }

    if (!code || !state || !stateCookie) {
      res.status(400).json({ error: "Google OAuth code or state is missing" });
      return;
    }

    try {
      const parsedState = JSON.parse(stateCookie) as { state?: string; nonce?: string };
      if (parsedState.state !== state || !parsedState.nonce) {
        res.status(403).json({ error: "Invalid Google OAuth state" });
        return;
      }

      if (!requireGoogleConfig(res)) return;
      const redirectUri = getRedirectUri(req);
      const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Google token exchange failed with HTTP ${tokenResponse.status}`);
      }

      const tokens = await tokenResponse.json() as { id_token?: string };
      if (!tokens.id_token) throw new Error("Google did not return an ID token");

      const verified = await jwtVerify(tokens.id_token, GOOGLE_JWKS, {
        issuer: GOOGLE_ISSUERS,
        audience: ENV.googleClientId,
      });
      if (verified.payload.nonce !== parsedState.nonce) {
        throw new Error("Google ID token nonce did not match the login request");
      }

      const subject = typeof verified.payload.sub === "string" ? verified.payload.sub : "";
      const email = typeof verified.payload.email === "string" ? verified.payload.email : null;
      const emailVerified = verified.payload.email_verified === true;
      const name = typeof verified.payload.name === "string" ? verified.payload.name : email?.split("@")[0] ?? "Google user";
      if (!subject || !email || !emailVerified) {
        throw new Error("Google account did not provide a verified email identity");
      }

      const openId = `google:${subject}`;
      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, { name, expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Google OAuth] Callback failed", error);
      res.redirect(302, "/?authError=google_callback_failed");
    }
  });
}
