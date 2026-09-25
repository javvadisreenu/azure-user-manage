import { LogLevel } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID,
    authority: `https://${import.meta.env.VITE_ENTRA_TENANT_SUBDOMAIN}.ciamlogin.com/`,
    knownAuthorities: [`${import.meta.env.VITE_ENTRA_TENANT_SUBDOMAIN}.ciamlogin.com`],
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
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
