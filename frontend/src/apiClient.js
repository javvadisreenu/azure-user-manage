import axios from "axios";
import { loginRequest } from "./authConfig";

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

export async function callApi(msal, account, method, path, data, orgId) {
  let tokenResponse;
  try {
    tokenResponse = await msal.acquireTokenSilent({ ...loginRequest, account });
  } catch {
    tokenResponse = await msal.acquireTokenPopup(loginRequest);
  }

  const headers = { Authorization: `Bearer ${tokenResponse.accessToken}` };
  if (orgId) headers["X-Organization-Id"] = orgId;

  return api.request({ method, url: path, data, headers });
}

export function getApi(msal, account, path, orgId) {
  return callApi(msal, account, "GET", path, undefined, orgId);
}

export function postApi(msal, account, path, data, orgId) {
  return callApi(msal, account, "POST", path, data, orgId);
}

export function deleteApi(msal, account, path, orgId) {
  return callApi(msal, account, "DELETE", path, undefined, orgId);
}

export function patchApi(msal, account, path, data, orgId) {
  return callApi(msal, account, "PATCH", path, data, orgId);
}
