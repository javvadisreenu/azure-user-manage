import { useState, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { getApi, postApi, patchApi, putApi, deleteApi } from "../apiClient";

export function useApi(activeOrgId) {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(
    async (fn) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fn(instance, account, activeOrgId);
        return res.data;
      } catch (err) {
        const msg = err.response?.data?.error || err.message || "Unknown error";
        setError(msg);
        if (err.response?.status === 409 && err.response?.data?.organizations) {
          throw { type: "tenant_selection_required", organizations: err.response.data.organizations };
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [instance, account, activeOrgId]
  );

  return {
    loading,
    error,
    get: (path) => request((msal, acc, org) => getApi(msal, acc, path, org)),
    post: (path, data) => request((msal, acc, org) => postApi(msal, acc, path, data, org)),
    patch: (path, data) => request((msal, acc, org) => patchApi(msal, acc, path, data, org)),
    put: (path, data) => request((msal, acc, org) => putApi(msal, acc, path, data, org)),
    del: (path) => request((msal, acc, org) => deleteApi(msal, acc, path, org)),
  };
}
