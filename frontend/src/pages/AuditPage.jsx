import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";

export default function AuditPage({ activeOrgId }) {
  const { get, loading, error } = useApi(activeOrgId);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    get(`/api/organizations/${activeOrgId}/audit`).then(setEvents).catch(() => {});
  }, [activeOrgId]);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <div className="page-title">Audit Log</div>
            <div className="page-subtitle">Security and administrative event trail</div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {loading && <div className="spinner" />}

        {!loading && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Event</th>
                    <th>Resource</th>
                    <th>Actor</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 && (
                    <tr><td colSpan={5} style={{ color: "var(--color-muted)", textAlign: "center" }}>No events</td></tr>
                  )}
                  {events.map((ev) => (
                    <tr key={ev.AuditEventId}>
                      <td style={{ fontSize: ".8rem", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                        {new Date(ev.CreatedUtc).toLocaleString()}
                      </td>
                      <td><span className="badge badge-blue">{ev.EventType}</span></td>
                      <td style={{ fontSize: ".85rem" }}>
                        {ev.ResourceType && <>{ev.ResourceType}<br /></>}
                        <span style={{ fontSize: ".75rem", color: "var(--color-muted)" }}>{ev.ResourceId}</span>
                      </td>
                      <td style={{ fontSize: ".8rem", color: "var(--color-muted)" }}>
                        {ev.ActorUserId ? ev.ActorUserId.slice(0, 8) + "…" : "system"}
                      </td>
                      <td style={{ fontSize: ".8rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.Details || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
