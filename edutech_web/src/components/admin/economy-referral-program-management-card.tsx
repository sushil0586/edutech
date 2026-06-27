"use client";

import { useState } from "react";

type InstituteOption = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type AdminReferralProgram = {
  id: string;
  institute: string;
  institute_name: string;
  name: string;
  referrer_stars: number;
  referee_stars: number;
  reward_side: string;
  valid_from: string | null;
  valid_until: string | null;
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

function toInputDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoOrNull(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function EconomyReferralProgramManagementCard({
  initialPrograms,
  institutes,
}: {
  initialPrograms: AdminReferralProgram[];
  institutes: InstituteOption[];
}) {
  const [programs, setPrograms] = useState(initialPrograms);
  const [editingId, setEditingId] = useState("");
  const [instituteId, setInstituteId] = useState(institutes[0]?.id ?? "");
  const [name, setName] = useState("");
  const [referrerStars, setReferrerStars] = useState("50");
  const [refereeStars, setRefereeStars] = useState("50");
  const [rewardSide, setRewardSide] = useState("both");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function resetForm() {
    setEditingId("");
    setInstituteId(institutes[0]?.id ?? "");
    setName("");
    setReferrerStars("50");
    setRefereeStars("50");
    setRewardSide("both");
    setValidFrom("");
    setValidUntil("");
    setIsActive(true);
  }

  function loadForEdit(program: AdminReferralProgram) {
    setEditingId(program.id);
    setInstituteId(program.institute);
    setName(program.name);
    setReferrerStars(String(program.referrer_stars));
    setRefereeStars(String(program.referee_stars));
    setRewardSide(program.reward_side);
    setValidFrom(toInputDateTime(program.valid_from));
    setValidUntil(toInputDateTime(program.valid_until));
    setIsActive(program.is_active);
    setMessage("");
    setError("");
  }

  async function handleSubmit() {
    if (!instituteId || !name.trim()) {
      setError("Institute and referral program name are required.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        editingId ? `/api/admin/economy/referral-programs/${editingId}` : "/api/admin/economy/referral-programs",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            institute: instituteId,
            name: name.trim(),
            referrer_stars: Number(referrerStars),
            referee_stars: Number(refereeStars),
            reward_side: rewardSide,
            valid_from: toIsoOrNull(validFrom),
            valid_until: toIsoOrNull(validUntil),
            metadata: {},
            is_active: isActive,
          }),
        },
      );

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
        data?: AdminReferralProgram;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Referral program save failed with status ${response.status}`,
        );
      }

      if (body.data) {
        setPrograms((current) => {
          const next = editingId
            ? current.map((item) => (item.id === body.data!.id ? body.data! : item))
            : [body.data!, ...current];
          return next.sort((a, b) => {
            if (a.institute_name !== b.institute_name) {
              return a.institute_name.localeCompare(b.institute_name);
            }
            return a.name.localeCompare(b.name);
          });
        });
      }

      setMessage(
        body.message ??
          (editingId ? "Referral program updated successfully." : "Referral program created successfully."),
      );
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save referral program.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Referral Governance</span>
        <h3>Create and edit referral campaigns and reward posture</h3>
        <p className="academicSectionDescription">
          This lane controls which institutes have active referral campaigns, who gets rewarded, and how many stars
          the referrer or joining learner receives.
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
            <span>Program name</span>
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Reward side</span>
            <select value={rewardSide} onChange={(event) => setRewardSide(event.target.value)}>
              <option value="both">Both</option>
              <option value="referrer">Referrer only</option>
              <option value="referee">Referee only</option>
            </select>
          </label>
          <label className="setupField">
            <span>Referrer stars</span>
            <input min="0" type="number" value={referrerStars} onChange={(event) => setReferrerStars(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Referee stars</span>
            <input min="0" type="number" value={refereeStars} onChange={(event) => setRefereeStars(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Valid from</span>
            <input type="datetime-local" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Valid until</span>
            <input type="datetime-local" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
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
            {saving ? "Saving..." : editingId ? "Update Referral Program" : "Create Referral Program"}
          </button>
          <button className="button buttonGhost" disabled={saving} onClick={resetForm} type="button">
            Clear Form
          </button>
        </div>

        <div className="weakTopicStack">
          {programs.map((program) => (
            <div className="weakTopicRow" key={program.id}>
              <div>
                <strong>{program.name}</strong>
                <span>
                  {program.institute_name} · {program.reward_side.replaceAll("_", " ")}
                </span>
                <span>
                  Referrer {program.referrer_stars} · Referee {program.referee_stars}
                </span>
                <span>Updated {formatDateTime(program.updated_at)}</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{program.is_active ? "Active" : "Paused"}</strong>
                <button className="button buttonGhost" onClick={() => loadForEdit(program)} type="button">
                  Edit
                </button>
              </div>
            </div>
          ))}
          {programs.length === 0 ? <p>No referral programs exist yet.</p> : null}
        </div>
      </div>
    </article>
  );
}
