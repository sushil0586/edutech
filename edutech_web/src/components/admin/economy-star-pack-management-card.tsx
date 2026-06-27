"use client";

import { useState } from "react";

type InstituteOption = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type AdminStarPack = {
  id: string;
  institute: string;
  institute_name: string;
  name: string;
  code: string;
  stars_credited: number;
  price_amount: string;
  currency: string;
  sort_order: number;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function EconomyStarPackManagementCard({
  initialStarPacks,
  institutes,
}: {
  initialStarPacks: AdminStarPack[];
  institutes: InstituteOption[];
}) {
  const [starPacks, setStarPacks] = useState(initialStarPacks);
  const [editingId, setEditingId] = useState("");
  const [instituteId, setInstituteId] = useState(institutes[0]?.id ?? "");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [starsCredited, setStarsCredited] = useState("100");
  const [priceAmount, setPriceAmount] = useState("99.00");
  const [currency, setCurrency] = useState("INR");
  const [sortOrder, setSortOrder] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function resetForm() {
    setEditingId("");
    setInstituteId(institutes[0]?.id ?? "");
    setName("");
    setCode("");
    setStarsCredited("100");
    setPriceAmount("99.00");
    setCurrency("INR");
    setSortOrder("1");
    setIsActive(true);
  }

  function loadForEdit(starPack: AdminStarPack) {
    setEditingId(starPack.id);
    setInstituteId(starPack.institute);
    setName(starPack.name);
    setCode(starPack.code);
    setStarsCredited(String(starPack.stars_credited));
    setPriceAmount(starPack.price_amount);
    setCurrency(starPack.currency);
    setSortOrder(String(starPack.sort_order));
    setIsActive(starPack.is_active);
    setMessage("");
    setError("");
  }

  async function handleSubmit() {
    if (!instituteId || !name.trim() || !code.trim()) {
      setError("Institute, name, and code are required.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        editingId ? `/api/admin/economy/star-packs/${editingId}` : "/api/admin/economy/star-packs",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            institute: instituteId,
            name: name.trim(),
            code: code.trim(),
            stars_credited: Number(starsCredited),
            price_amount: priceAmount,
            currency: currency.trim() || "INR",
            sort_order: Number(sortOrder),
            is_active: isActive,
            metadata: {},
          }),
        },
      );

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
        data?: AdminStarPack;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Star pack save failed with status ${response.status}`,
        );
      }

      if (body.data) {
        setStarPacks((current) => {
          const next = editingId
            ? current.map((item) => (item.id === body.data!.id ? body.data! : item))
            : [body.data!, ...current];
          return next.sort((a, b) => {
            if (a.institute_name !== b.institute_name) {
              return a.institute_name.localeCompare(b.institute_name);
            }
            if (a.sort_order !== b.sort_order) {
              return a.sort_order - b.sort_order;
            }
            return a.name.localeCompare(b.name);
          });
        });
      }

      setMessage(body.message ?? (editingId ? "Star pack updated successfully." : "Star pack created successfully."));
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save star pack.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Star Pack Governance</span>
        <h3>Create and edit live wallet pack offers</h3>
        <p className="academicSectionDescription">
          This is the first full CRUD lane in economy governance. Platform admin can now create and refine the one-time
          purchase packs that students see in the wallet.
        </p>

        {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
        {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

        <div className="setupFormGrid setupFormGridDense">
          <label className="setupField">
            <span>Institute</span>
            <select value={instituteId} onChange={(event) => setInstituteId(event.target.value)}>
              {institutes.map((institute) => (
                <option key={institute.id} value={institute.id}>
                  {institute.name} ({institute.code}){institute.is_active ? "" : " - inactive"}
                </option>
              ))}
            </select>
          </label>
          <label className="setupField">
            <span>Pack name</span>
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Pack code</span>
            <input type="text" value={code} onChange={(event) => setCode(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Stars credited</span>
            <input min="1" type="number" value={starsCredited} onChange={(event) => setStarsCredited(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Price amount</span>
            <input min="0.01" step="0.01" type="number" value={priceAmount} onChange={(event) => setPriceAmount(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Currency</span>
            <input type="text" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
          </label>
          <label className="setupField">
            <span>Sort order</span>
            <input min="0" type="number" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Active status</span>
            <select value={isActive ? "yes" : "no"} onChange={(event) => setIsActive(event.target.value === "yes")}>
              <option value="yes">Active</option>
              <option value="no">Paused</option>
            </select>
          </label>
        </div>

        <div className="resultCardActions">
          <button className="button buttonPrimary" disabled={saving} onClick={() => void handleSubmit()} type="button">
            {saving ? "Saving..." : editingId ? "Update Star Pack" : "Create Star Pack"}
          </button>
          <button className="button buttonGhost" disabled={saving} onClick={resetForm} type="button">
            Clear Form
          </button>
        </div>

        <div className="weakTopicStack">
          {starPacks.map((starPack) => (
            <div className="weakTopicRow" key={starPack.id}>
              <div>
                <strong>{starPack.name}</strong>
                <span>
                  {starPack.institute_name} · {starPack.code}
                </span>
                <span>
                  {starPack.stars_credited} stars · {starPack.currency} {starPack.price_amount} · sort {starPack.sort_order}
                </span>
                <span>Updated {formatDateTime(starPack.updated_at)}</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{starPack.is_active ? "Active" : "Paused"}</strong>
                <button className="button buttonGhost" onClick={() => loadForEdit(starPack)} type="button">
                  Edit
                </button>
              </div>
            </div>
          ))}
          {starPacks.length === 0 ? <p>No star packs exist yet.</p> : null}
        </div>
      </div>
    </article>
  );
}
