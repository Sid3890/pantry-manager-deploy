const firstSet = (...values: Array<string | undefined>) => values.find(value => Boolean(value)) ?? "";

export const ENV = {
  appId: firstSet(process.env.GOOGLE_CLIENT_ID, process.env.VITE_APP_ID, process.env.MANUS_PROJECT_ID),
  cookieSecret: firstSet(process.env.JWT_SECRET, process.env.MANUS_JWT_SECRET),
  databaseUrl: firstSet(process.env.DATABASE_URL, process.env.DRIZZLE_DATABASE_URL),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: firstSet(process.env.BUILT_IN_FORGE_API_URL),
  forgeApiKey: firstSet(process.env.BUILT_IN_FORGE_API_KEY),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
};
