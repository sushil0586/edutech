"use client";

import { useState } from "react";

type InstituteOption = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type SubjectOption = {
  id: string;
  institute: string;
  name: string;
  is_active: boolean;
};

type AdminContentAccessPolicy = {
  id: string;
  institute: string;
  institute_name: string;
  subject: string | null;
  subject_name: string | null;
  content_type: string;
  content_key: string;
  content_label: string;
  policy_type: string;
  star_cost: number;
  entitlement_code: string;
  priority: number;
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

export function EconomyContentAccessPolicyManagementCard({
  initialPolicies,
  institutes,
  subjects,
}: {
  initialPolicies: AdminContentAccessPolicy[];
  institutes: InstituteOption[];
  subjects: SubjectOption[];
}) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [editingId, setEditingId] = useState("");
  const [instituteId, setInstituteId] = useState(institutes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState("");
  const [contentType, setContentType] = useState("exam");
  const [contentKey, setContentKey] = useState("");
  const [contentLabel, setContentLabel] = useState("");
  const [policyType, setPolicyType] = useState("free");
  const [starCost, setStarCost] = useState("0");
  const [entitlementCode, setEntitlementCode] = useState("");
  const [priority, setPriority] = useState("100");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredSubjects = subjects.filter((subject) => subject.institute === instituteId);

  function resetForm() {
    setEditingId("");
    setInstituteId(institutes[0]?.id ?? "");
    setSubjectId("");
    setContentType("exam");
    setContentKey("");
    setContentLabel("");
    setPolicyType("free");
    setStarCost("0");
    setEntitlementCode("");
    setPriority("100");
    setIsActive(true);
  }

  function loadForEdit(policy: AdminContentAccessPolicy) {
    setEditingId(policy.id);
    setInstituteId(policy.institute);
    setSubjectId(policy.subject ?? "");
    setContentType(policy.content_type);
    setContentKey(policy.content_key);
    setContentLabel(policy.content_label);
    setPolicyType(policy.policy_type);
    setStarCost(String(policy.star_cost));
    setEntitlementCode(policy.entitlement_code);
    setPriority(String(policy.priority));
    setIsActive(policy.is_active);
    setMessage("");
    setError("");
  }

  async function handleSubmit() {
    if (!instituteId || !contentType.trim() || !contentKey.trim()) {
      setError("Institute, content type, and content key are required.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/economy/content-access-policies/${editingId}`
          : "/api/admin/economy/content-access-policies",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            institute: instituteId,
            subject: subjectId || null,
            content_type: contentType.trim(),
            content_key: contentKey.trim(),
            content_label: contentLabel.trim(),
            policy_type: policyType,
            star_cost: Number(starCost),
            entitlement_code: entitlementCode.trim(),
            priority: Number(priority),
            metadata: {},
            is_active: isActive,
          }),
        },
      );

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
        data?: AdminContentAccessPolicy;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Content access policy save failed with status ${response.status}`,
        );
      }

      if (body.data) {
        setPolicies((current) => {
          const next = editingId
            ? current.map((item) => (item.id === body.data!.id ? body.data! : item))
            : [body.data!, ...current];
          return next.sort((a, b) => {
            if (a.institute_name !== b.institute_name) {
              return a.institute_name.localeCompare(b.institute_name);
            }
            if (a.priority !== b.priority) {
              return a.priority - b.priority;
            }
            return `${a.content_type}:${a.content_key}`.localeCompare(`${b.content_type}:${b.content_key}`);
          });
        });
      }

      setMessage(
        body.message ??
          (editingId
            ? "Content access policy updated successfully."
            : "Content access policy created successfully."),
      );
      resetForm();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save content access policy.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Access Governance</span>
        <h3>Create and edit premium access policies by content target</h3>
        <p className="academicSectionDescription">
          This lane controls whether a target stays free, requires stars, requires entitlement, or allows either path
          before the learner can open premium content.
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
            <span>Subject</span>
            <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              <option value="">All subjects / no subject scope</option>
              {filteredSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}{subject.is_active ? "" : " - inactive"}
                </option>
              ))}
            </select>
          </label>
          <label className="setupField">
            <span>Content type</span>
            <input type="text" value={contentType} onChange={(event) => setContentType(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Content key</span>
            <input type="text" value={contentKey} onChange={(event) => setContentKey(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Content label</span>
            <input type="text" value={contentLabel} onChange={(event) => setContentLabel(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Policy type</span>
            <select value={policyType} onChange={(event) => setPolicyType(event.target.value)}>
              <option value="free">Free</option>
              <option value="stars_only">Stars only</option>
              <option value="entitlement_only">Entitlement only</option>
              <option value="stars_or_entitlement">Stars or entitlement</option>
            </select>
          </label>
          <label className="setupField">
            <span>Star cost</span>
            <input min="0" type="number" value={starCost} onChange={(event) => setStarCost(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Entitlement code</span>
            <input type="text" value={entitlementCode} onChange={(event) => setEntitlementCode(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Priority</span>
            <input min="0" type="number" value={priority} onChange={(event) => setPriority(event.target.value)} />
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
            {saving ? "Saving..." : editingId ? "Update Access Policy" : "Create Access Policy"}
          </button>
          <button className="button buttonGhost" disabled={saving} onClick={resetForm} type="button">
            Clear Form
          </button>
        </div>

        <div className="weakTopicStack">
          {policies.map((policy) => (
            <div className="weakTopicRow" key={policy.id}>
              <div>
                <strong>{policy.content_label || `${policy.content_type}:${policy.content_key}`}</strong>
                <span>
                  {policy.institute_name} · {policy.policy_type.replaceAll("_", " ")}
                  {policy.subject_name ? ` · ${policy.subject_name}` : ""}
                </span>
                <span>
                  {policy.star_cost > 0 ? `${policy.star_cost} stars` : "No star cost"}
                  {policy.entitlement_code ? ` · ${policy.entitlement_code}` : ""}
                  {` · priority ${policy.priority}`}
                </span>
                <span>Updated {formatDateTime(policy.updated_at)}</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{policy.is_active ? "Active" : "Paused"}</strong>
                <button className="button buttonGhost" onClick={() => loadForEdit(policy)} type="button">
                  Edit
                </button>
              </div>
            </div>
          ))}
          {policies.length === 0 ? <p>No content access policies exist yet.</p> : null}
        </div>
      </div>
    </article>
  );
}
