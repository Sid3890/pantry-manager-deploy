// Starts the server-side Google OAuth flow. The client secret never reaches the browser.
export const startGoogleLogin = () => {
  window.location.assign("/api/oauth/google");
};
