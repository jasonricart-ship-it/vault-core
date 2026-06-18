"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const STONE = "#1A1208";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";

type ReviewListItem = {
  id: string;
  gum_code: string;
  item_type: string;
  status: string;
  primary_evidence_class: string | null;
  submitted_at: string;
  player_name: string | null;
  ppc_number: string | null;
};

type EvidenceFile = {
  id: string;
  evidence_class: string;
  file_type: string;
  original_filename: string | null;
  file_size_bytes: number | null;
  metadata_verified: boolean;
  download_url: string;
};

type GumDetail = Record<string, unknown> & {
  id: string;
  gum_code: string;
  item_type: string;
  item_description: string;
  status: string;
  owner_statement: string | null;
  evaluator_notes: string | null;
  primary_evidence_class: string | null;
  evidence_files: EvidenceFile[];
  player: {
    display_name: string;
    ppc_number: string;
  } | null;
  org: { name: string; org_code: string } | null;
  event: { name: string; evt_code: string } | null;
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function panelStyle(): React.CSSProperties {
  return {
    background: STONE,
    border: "0.5px solid #B8972A22",
    borderRadius: 2,
    padding: 16,
  };
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p
        style={{
          margin: 0,
          fontSize: 9,
          color: "#B8972A88",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: PARCHMENT, lineHeight: 1.5 }}>
        {value}
      </p>
    </div>
  );
}

export function GumReviewPanel() {
  const [items, setItems] = useState<ReviewListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GumDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch("/api/gum/review", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load queue");
      setItems(data.items ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load queue",
      );
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/gum/review/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load item");
      const gumItem = data.gum_item as GumDetail;
      setDetail(gumItem);
      setNotes(String(gumItem.evaluator_notes ?? ""));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load item",
      );
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openItem = (id: string) => {
    setSelectedId(id);
    void loadDetail(id);
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setNotes("");
    setMessage(null);
  };

  const runAction = async (status: string) => {
    if (!selectedId) return;
    setActing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/gum/${encodeURIComponent(selectedId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          evaluator_notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");

      setMessage(`Item ${data.gum_code} updated to ${data.status}.`);
      closeDetail();
      await loadList();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Action failed",
      );
    } finally {
      setActing(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: "#F5F2EC88" }}>
          {loadingList ? "Loading queue…" : `${items.length} item(s) awaiting review`}
        </p>
        <Link
          href="/vault"
          style={{
            fontSize: 11,
            color: "#B8972A99",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Back to vault
        </Link>
      </div>

      {error && (
        <p style={{ color: "#C47A6A", fontSize: 13, marginBottom: 16 }}>{error}</p>
      )}
      {message && (
        <p style={{ color: GOLD, fontSize: 13, marginBottom: 16 }}>{message}</p>
      )}

      {!selectedId ? (
        <div style={{ display: "grid", gap: 10 }}>
          {!loadingList && items.length === 0 && (
            <div style={panelStyle()}>
              <p style={{ margin: 0, color: "#F5F2EC88", fontSize: 14 }}>
                No pending or in-review GUM items.
              </p>
            </div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openItem(item.id)}
              style={{
                ...panelStyle(),
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: SERIF,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 14, color: GOLD }}>{item.gum_code}</p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12,
                      color: PARCHMENT,
                      textTransform: "capitalize",
                    }}
                  >
                    {capitalize(item.item_type)}
                  </p>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    color: "#FFB84A",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {item.status.replace("_", " ")}
                </p>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#F5F2EC99" }}>
                {item.player_name ?? "—"} · {item.ppc_number ?? "—"}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#F5F2EC66" }}>
                Submitted {formatDate(item.submitted_at)}
                {item.primary_evidence_class
                  ? ` · ${item.primary_evidence_class}`
                  : " · No evidence class"}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={closeDetail}
            style={{
              background: "transparent",
              border: "none",
              color: "#B8972A99",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              marginBottom: 16,
              fontFamily: SERIF,
            }}
          >
            ← Back to queue
          </button>

          {loadingDetail || !detail ? (
            <p style={{ color: "#F5F2EC88" }}>Loading item…</p>
          ) : (
            <>
              <div style={{ ...panelStyle(), marginBottom: 16 }}>
                <h2
                  style={{
                    margin: "0 0 16px",
                    fontSize: 18,
                    fontWeight: "normal",
                    color: GOLD,
                    letterSpacing: "0.1em",
                  }}
                >
                  {detail.gum_code}
                </h2>
                <FieldRow label="Status" value={detail.status.replace("_", " ")} />
                <FieldRow
                  label="Item type"
                  value={capitalize(detail.item_type)}
                />
                <FieldRow label="Description" value={detail.item_description} />
                <FieldRow
                  label="Player"
                  value={
                    detail.player
                      ? `${detail.player.display_name} (${detail.player.ppc_number})`
                      : "—"
                  }
                />
                <FieldRow
                  label="Organization"
                  value={
                    detail.org
                      ? `${detail.org.name} (${detail.org.org_code})`
                      : "—"
                  }
                />
                <FieldRow
                  label="Event"
                  value={
                    detail.event
                      ? `${detail.event.name} (${detail.event.evt_code})`
                      : "—"
                  }
                />
                <FieldRow
                  label="Owner statement"
                  value={detail.owner_statement ?? "—"}
                />
                <FieldRow
                  label="Primary evidence class"
                  value={detail.primary_evidence_class ?? "—"}
                />
                <FieldRow
                  label="Capturer credit"
                  value={String(detail.capturer_credit ?? "—")}
                />
                <FieldRow
                  label="Submitted"
                  value={formatDate(detail.created_at as string)}
                />
                <FieldRow
                  label="Evaluator notes (on file)"
                  value={detail.evaluator_notes ?? "—"}
                />
              </div>

              <div style={{ ...panelStyle(), marginBottom: 16 }}>
                <p
                  style={{
                    margin: "0 0 12px",
                    fontSize: 10,
                    color: GOLD,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  Evidence files
                </p>
                {detail.evidence_files.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: "#F5F2EC66" }}>
                    No evidence files attached.
                  </p>
                ) : (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {detail.evidence_files.map((file) => (
                      <li
                        key={file.id}
                        style={{
                          marginBottom: 10,
                          paddingBottom: 10,
                          borderBottom: "0.5px solid #B8972A22",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 13, color: PARCHMENT }}>
                          {file.original_filename ?? file.file_key}
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#F5F2EC77" }}>
                          {file.evidence_class} · {file.file_type}
                          {file.metadata_verified ? " · metadata verified" : ""}
                        </p>
                        <a
                          href={file.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            marginTop: 6,
                            fontSize: 11,
                            color: GOLD,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          Download
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={panelStyle()}>
                <label
                  htmlFor="evaluator-notes"
                  style={{
                    display: "block",
                    fontSize: 10,
                    color: GOLD,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Notes
                </label>
                <textarea
                  id="evaluator-notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for this action…"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: BG,
                    border: "0.5px solid #B8972A33",
                    color: PARCHMENT,
                    fontFamily: SERIF,
                    fontSize: 13,
                    padding: 10,
                    resize: "vertical",
                  }}
                />

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    marginTop: 16,
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  }}
                >
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void runAction("authenticated")}
                    style={{
                      background: "transparent",
                      border: `0.5px solid ${GOLD}`,
                      color: GOLD,
                      padding: "12px 14px",
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      cursor: acting ? "wait" : "pointer",
                      fontFamily: SERIF,
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void runAction("pending")}
                    style={{
                      background: "transparent",
                      border: "0.5px solid #FFB84A88",
                      color: "#FFB84A",
                      padding: "12px 14px",
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      cursor: acting ? "wait" : "pointer",
                      fontFamily: SERIF,
                    }}
                  >
                    Request more evidence
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void runAction("rejected")}
                    style={{
                      background: "transparent",
                      border: "0.5px solid #C47A6A88",
                      color: "#C47A6A",
                      padding: "12px 14px",
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      cursor: acting ? "wait" : "pointer",
                      fontFamily: SERIF,
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
