import { LogLevel } from "@azure/msal-browser";

// Accept either "fpass" or "fpass.onmicrosoft.com" — normalise to the bare subdomain
const rawSubdomain = import.meta.env.VITE_ENTRA_TENANT_SUBDOMAIN || "";
const tenantSubdomain = rawSubdomain
  .replace(/\.onmicrosoft\.com$/i, "")
  .replace(/\.ciamlogin\.com$/i, "")
  .trim();

const authorityHost = `${tenantSubdomain}.ciamlogin.com`;

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID,
    authority: `https://${authorityHost}/`,
    knownAuthorities: [authorityHost],
    redirectUri: window.location.origin + "/",
    postLogoutRedirectUri: window.location.origin + "/",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
    },
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", import.meta.env.VITE_API_SCOPE],
};

export const signUpRequest = {
  scopes: ["openid", "profile", import.meta.env.VITE_API_SCOPE],
  prompt: "create",
};
