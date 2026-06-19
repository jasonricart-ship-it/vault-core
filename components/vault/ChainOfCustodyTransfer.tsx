"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  TRANSFER_TYPES,
  type TransferAuthorityItem,
  type TransferCurrentUser,
  type TransferRecipient,
  type TransferType,
} from "@/lib/transfer";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const BG = "#0A0908";
const STONE = "#14100C";
const SERIF = "Georgia, 'Times New Roman', serif";

function formatLabel(value: string) {
  return value.replace(/_/g, " ").toUpperCase();
}

export function ChainOfCustodyTransfer({
  items,
  currentUser,
}: {
  items: TransferAuthorityItem[];
  currentUser: TransferCurrentUser;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [registryQuery, setRegistryQuery] = useState("");
  const [recipient, setRecipient] = useState<TransferRecipient | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [transferType, setTransferType] = useState<TransferType>("sale");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const resetRecipient = useCallback(() => {
    setRecipient(null);
    setSearchError(null);
  }, []);

  const handleSelectItem = useCallback(
    (itemId: string) => {
      setSelectedId(itemId);
      setSuccessId(null);
      setSubmitError(null);
      resetRecipient();
      setRegistryQuery("");
    },
    [resetRecipient],
  );

  const handleSearch = async () => {
    const query = registryQuery.trim();
    if (!query) {
      setSearchError("Enter a PPC or VRC number.");
      setRecipient(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    setRecipient(null);

    try {
      const response = await fetch(`/api/transfer/resolve?q=${encodeURIComponent(query)}`);
      const data = (await response.json()) as {
        recipient?: TransferRecipient;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Lookup failed");
      }

      if (data.recipient?.account_id === currentUser.account_id) {
        throw new Error("Cannot transfer authority to your own account.");
      }

      setRecipient(data.recipient ?? null);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Lookup failed");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedItem) {
      setSubmitError("Select an item to transfer.");
      return;
    }
    if (!recipient) {
      setSubmitError("Resolve a receiving party by PPC or VRC number.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSuccessId(null);

    try {
      const response = await fetch("/api/transfer/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: selectedItem.id,
          to_account_id: recipient.account_id,
          transfer_type: transferType,
        }),
      });

      const data = (await response.json()) as {
        transfer_id?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Transfer failed");
      }

      setSuccessId(data.transfer_id ?? null);
      setRegistryQuery("");
      setRecipient(null);
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>Chain of Custody · VRC Wing</p>
        <h1 style={titleStyle}>Authority Transfer</h1>
        <p style={subtitleStyle}>
          Initiate a witnessed handoff of GUM item authority. The receiving party must confirm
          acceptance before custody is complete.
        </p>
      </header>

      <div style={panelsStyle}>
        <section style={leftPanelStyle}>
          <h2 style={panelTitleStyle}>Your Authority</h2>
          <p style={panelHintStyle}>
            GUM items currently under your custody ({items.length})
          </p>

          {items.length === 0 ? (
            <div style={emptyStyle}>
              <p style={bodyStyle}>No transferable items under your authority.</p>
            </div>
          ) : (
            <ul style={itemListStyle}>
              {items.map((item) => {
                const selected = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectItem(item.id)}
                      style={{
                        ...itemButtonStyle,
                        borderColor: selected ? GOLD : "#B8972A33",
                        background: selected ? "#1A1208" : "transparent",
                      }}
                    >
                      <p style={gumCodeStyle}>{item.gum_code}</p>
                      <p style={itemNameStyle}>{item.item_description}</p>
                      <div style={itemMetaStyle}>
                        <span>{formatLabel(item.item_type)}</span>
                        <span>·</span>
                        <span>{formatLabel(item.status)}</span>
                        {item.player_ppc && (
                          <>
                            <span>·</span>
                            <span>{item.player_ppc}</span>
                          </>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section style={rightPanelStyle}>
          <h2 style={panelTitleStyle}>Transfer Form</h2>

          {successId ? (
            <div style={successBoxStyle}>
              <p style={{ ...bodyStyle, color: PARCHMENT }}>Transfer initiated.</p>
              <p style={{ ...gumCodeStyle, marginTop: 12 }}>{successId}</p>
              <p style={{ ...panelHintStyle, marginTop: 12 }}>
                The receiving party has been notified and must confirm acceptance.
              </p>
              <button
                type="button"
                onClick={() => setSuccessId(null)}
                style={{ ...primaryButtonStyle, marginTop: 20 }}
              >
                Initiate another transfer
              </button>
            </div>
          ) : !selectedItem ? (
            <div style={emptyStyle}>
              <p style={bodyStyle}>Select an item from the left panel to begin.</p>
            </div>
          ) : (
            <form onSubmit={(event) => void handleSubmit(event)} style={formStyle}>
              <div style={detailBlockStyle}>
                <p style={sectionLabelStyle}>Item details</p>
                <dl style={detailGridStyle}>
                  <div>
                    <dt style={labelStyle}>GUM code</dt>
                    <dd style={valueStyle}>{selectedItem.gum_code}</dd>
                  </div>
                  <div>
                    <dt style={labelStyle}>Type</dt>
                    <dd style={valueStyle}>{formatLabel(selectedItem.item_type)}</dd>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <dt style={labelStyle}>Description</dt>
                    <dd style={valueStyle}>{selectedItem.item_description}</dd>
                  </div>
                  <div>
                    <dt style={labelStyle}>Vault level</dt>
                    <dd style={valueStyle}>{formatLabel(selectedItem.vault_level)}</dd>
                  </div>
                  <div>
                    <dt style={labelStyle}>Status</dt>
                    <dd style={valueStyle}>{formatLabel(selectedItem.status)}</dd>
                  </div>
                  {selectedItem.player_display_name && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <dt style={labelStyle}>Linked player</dt>
                      <dd style={valueStyle}>
                        {selectedItem.player_display_name}
                        {selectedItem.player_ppc ? ` (${selectedItem.player_ppc})` : ""}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div style={detailBlockStyle}>
                <p style={sectionLabelStyle}>Current authority</p>
                <p style={valueStyle}>{currentUser.display_name}</p>
                <p style={panelHintStyle}>
                  {formatLabel(selectedItem.authority_type)} · session account
                </p>
              </div>

              <div style={detailBlockStyle}>
                <p style={sectionLabelStyle}>Transfer to</p>
                <div style={searchRowStyle}>
                  <input
                    value={registryQuery}
                    onChange={(event) => {
                      setRegistryQuery(event.target.value);
                      resetRecipient();
                    }}
                    placeholder="PPC-00086 or VRC-00101"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSearch()}
                    disabled={searching}
                    style={secondaryButtonStyle}
                  >
                    {searching ? "Searching…" : "Search"}
                  </button>
                </div>
                {searchError && <p style={errorStyle}>{searchError}</p>}
                {recipient && (
                  <div style={recipientBoxStyle}>
                    <p style={gumCodeStyle}>{recipient.registry_number}</p>
                    <p style={valueStyle}>{recipient.display_name}</p>
                    <p style={panelHintStyle}>{formatLabel(recipient.registry_type)} registry</p>
                  </div>
                )}
              </div>

              <label style={fieldStyle}>
                <span style={labelStyle}>Transfer type *</span>
                <select
                  required
                  value={transferType}
                  onChange={(event) => setTransferType(event.target.value as TransferType)}
                  style={inputStyle}
                >
                  {TRANSFER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatLabel(type)}
                    </option>
                  ))}
                </select>
              </label>

              {submitError && <p style={errorStyle}>{submitError}</p>}

              <button type="submit" disabled={submitting || !recipient} style={primaryButtonStyle}>
                {submitting ? "Initiating…" : "Initiate Transfer"}
              </button>
            </form>
          )}
        </section>
      </div>

      <footer style={footerStyle}>
        <Link href="/vault/vrc" style={backLinkStyle}>
          ← Back to Collector Wing
        </Link>
      </footer>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100dvh",
  background: BG,
  color: PARCHMENT,
  fontFamily: SERIF,
  backgroundImage: `
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.012) 2px,
      rgba(255,255,255,0.012) 4px
    )
  `,
};

const headerStyle: CSSProperties = {
  padding: "calc(24px + env(safe-area-inset-top, 0px)) 20px 20px",
  textAlign: "center",
  borderBottom: "1px solid #B8972A22",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 10,
  color: "#B8972A88",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  margin: "0 0 8px",
};

const titleStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 400,
  color: GOLD,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  fontSize: 13,
  color: "#F5F2EC88",
  lineHeight: 1.6,
  maxWidth: 640,
  margin: "12px auto 0",
};

const panelsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "stretch",
  gap: 16,
  maxWidth: 1100,
  margin: "0 auto",
  padding: "20px 16px 32px",
};

const leftPanelStyle: CSSProperties = {
  flex: "1 1 280px",
  borderRadius: 10,
  border: "1px solid #B8972A33",
  background: STONE,
  padding: "16px 14px",
  minHeight: 420,
};

const rightPanelStyle: CSSProperties = {
  flex: "1.2 1 320px",
  borderRadius: 10,
  border: "1px solid #B8972A33",
  background: STONE,
  padding: "16px 14px",
  minHeight: 420,
};

const panelTitleStyle: CSSProperties = {
  fontSize: 12,
  color: GOLD,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  margin: "0 0 6px",
};

const panelHintStyle: CSSProperties = {
  fontSize: 11,
  color: "#F5F2EC66",
  margin: "0 0 14px",
  lineHeight: 1.5,
};

const emptyStyle: CSSProperties = {
  padding: "32px 16px",
  textAlign: "center",
  border: "1px solid #B8972A22",
  borderRadius: 8,
  background: "#0A0908",
};

const bodyStyle: CSSProperties = {
  fontSize: 14,
  color: "#F5F2EC99",
  margin: 0,
};

const itemListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  maxHeight: "calc(100dvh - 280px)",
  overflowY: "auto",
};

const itemButtonStyle: CSSProperties = {
  width: "100%",
  padding: "14px 12px",
  borderRadius: 8,
  border: "1px solid #B8972A33",
  background: "transparent",
  color: PARCHMENT,
  fontFamily: SERIF,
  cursor: "pointer",
  textAlign: "left",
};

const gumCodeStyle: CSSProperties = {
  fontSize: 10,
  color: GOLD,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  margin: 0,
};

const itemNameStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
  margin: "4px 0 0",
  color: PARCHMENT,
};

const itemMetaStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 8,
  fontSize: 10,
  color: "#F5F2EC77",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const formStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const detailBlockStyle: CSSProperties = {
  padding: "14px 12px",
  borderRadius: 8,
  border: "1px solid #B8972A22",
  background: "#0A0908",
};

const detailGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
  margin: "10px 0 0",
};

const labelStyle: CSSProperties = {
  fontSize: 10,
  color: "#B8972A88",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  margin: 0,
};

const valueStyle: CSSProperties = {
  fontSize: 14,
  color: PARCHMENT,
  margin: "4px 0 0",
};

const sectionLabelStyle: CSSProperties = {
  ...labelStyle,
  marginBottom: 0,
};

const fieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 6,
  border: "1px solid #B8972A44",
  background: "#0A0908",
  color: PARCHMENT,
  fontFamily: SERIF,
  fontSize: 14,
};

const searchRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 8,
};

const secondaryButtonStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 6,
  border: "1px solid #B8972A44",
  background: "transparent",
  color: PARCHMENT,
  fontFamily: SERIF,
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const primaryButtonStyle: CSSProperties = {
  padding: "14px 22px",
  borderRadius: 8,
  border: "none",
  background: GOLD,
  color: BG,
  fontFamily: SERIF,
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: "pointer",
  width: "100%",
};

const recipientBoxStyle: CSSProperties = {
  marginTop: 12,
  padding: "12px",
  borderRadius: 6,
  border: "1px solid #B8972A44",
  background: "#14100C",
};

const errorStyle: CSSProperties = {
  fontSize: 12,
  color: "#FF9B9B",
  margin: "8px 0 0",
};

const successBoxStyle: CSSProperties = {
  padding: "24px 16px",
  borderRadius: 8,
  border: "1px solid #B8972A44",
  background: "#0A0908",
  textAlign: "center",
};

const footerStyle: CSSProperties = {
  padding: "16px 20px calc(24px + env(safe-area-inset-bottom, 0px))",
  textAlign: "center",
};

const backLinkStyle: CSSProperties = {
  fontSize: 12,
  color: "#B8972A88",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  textDecoration: "none",
};
