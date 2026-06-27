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

type AdminUnlockRule = {
  id: string;
  institute: string;
  institute_name: string;
  subject: string | null;
  subject_name: string | null;
  content_type: string;
  content_key: string;
  content_label: string;
  rule_type: string;
  required_star_balance: number | null;
  required_entitlement_code: string;
  required_completion_count: number | null;
  required_score_percentage: string | null;
  admin_override_allowed: boolean;
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

export function EconomyUnlockRuleManagementCard({
  initialRules,
  institutes,
  subjects,
}: {
  initialRules: AdminUnlockRule[];
  institutes: InstituteOption[];
  subjects: SubjectOption[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [editingId, setEditingId] = useState("");
  const [instituteId, setInstituteId] = useState(institutes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState("");
  const [contentType, setContentType] = useState("exam");
  const [contentKey, setContentKey] = useState("");
  const [contentLabel, setContentLabel] = useState("");
  const [ruleType, setRuleType] = useState("stars_balance");
  const [requiredStarBalance, setRequiredStarBalance] = useState("");
  const [requiredEntitlementCode, setRequiredEntitlementCode] = useState("");
  const [requiredCompletionCount, setRequiredCompletionCount] = useState("");
  const [requiredScorePercentage, setRequiredScorePercentage] = useState("");
  const [adminOverrideAllowed, setAdminOverrideAllowed] = useState(true);
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
    setRuleType("stars_balance");
    setRequiredStarBalance("");
    setRequiredEntitlementCode("");
    setRequiredCompletionCount("");
    setRequiredScorePercentage("");
    setAdminOverrideAllowed(true);
    setPriority("100");
    setIsActive(true);
  }

  function loadForEdit(rule: AdminUnlockRule) {
    setEditingId(rule.id);
    setInstituteId(rule.institute);
    setSubjectId(rule.subject ?? "");
    setContentType(rule.content_type);
    setContentKey(rule.content_key);
    setContentLabel(rule.content_label);
    setRuleType(rule.rule_type);
    setRequiredStarBalance(rule.required_star_balance != null ? String(rule.required_star_balance) : "");
    setRequiredEntitlementCode(rule.required_entitlement_code);
    setRequiredCompletionCount(
      rule.required_completion_count != null ? String(rule.required_completion_count) : "",
    );
    setRequiredScorePercentage(rule.required_score_percentage ?? "");
    setAdminOverrideAllowed(rule.admin_override_allowed);
    setPriority(String(rule.priority));
    setIsActive(rule.is_active);
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
        editingId ? `/api/admin/economy/unlock-rules/${editingId}` : "/api/admin/economy/unlock-rules",
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
            rule_type: ruleType,
            required_star_balance: requiredStarBalance ? Number(requiredStarBalance) : null,
            required_entitlement_code: requiredEntitlementCode.trim(),
            required_completion_count: requiredCompletionCount ? Number(requiredCompletionCount) : null,
            required_score_percentage: requiredScorePercentage || null,
            admin_override_allowed: adminOverrideAllowed,
            priority: Number(priority),
            metadata: {},
            is_active: isActive,
          }),
        },
      );

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
        data?: AdminUnlockRule;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Unlock rule save failed with status ${response.status}`,
        );
      }

      if (body.data) {
        setRules((current) => {
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
        body.message ?? (editingId ? "Unlock rule updated successfully." : "Unlock rule created successfully."),
      );
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save unlock rule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Unlock Governance</span>
        <h3>Create and edit unlock rules by content target</h3>
        <p className="academicSectionDescription">
          This lane defines which learner state must be true before premium content becomes available, including star
          balance, entitlement, completion count, score threshold, and support override posture.
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
            <span>Rule type</span>
            <select value={ruleType} onChange={(event) => setRuleType(event.target.value)}>
              <option value="stars_balance">Stars balance</option>
              <option value="entitlement">Entitlement</option>
              <option value="exam_completion">Exam completion</option>
              <option value="score_threshold">Score threshold</option>
              <option value="admin_approval">Admin approval</option>
              <option value="composite">Composite</option>
            </select>
          </label>
          <label className="setupField">
            <span>Required star balance</span>
            <input min="0" type="number" value={requiredStarBalance} onChange={(event) => setRequiredStarBalance(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Required entitlement code</span>
            <input type="text" value={requiredEntitlementCode} onChange={(event) => setRequiredEntitlementCode(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Required completion count</span>
            <input min="0" type="number" value={requiredCompletionCount} onChange={(event) => setRequiredCompletionCount(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Required score %</span>
            <input min="0" max="100" step="0.01" type="number" value={requiredScorePercentage} onChange={(event) => setRequiredScorePercentage(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Admin override allowed</span>
            <select value={adminOverrideAllowed ? "yes" : "no"} onChange={(event) => setAdminOverrideAllowed(event.target.value === "yes")}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
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
            {saving ? "Saving..." : editingId ? "Update Unlock Rule" : "Create Unlock Rule"}
          </button>
          <button className="button buttonGhost" disabled={saving} onClick={resetForm} type="button">
            Clear Form
          </button>
        </div>

        <div className="weakTopicStack">
          {rules.map((rule) => (
            <div className="weakTopicRow" key={rule.id}>
              <div>
                <strong>{rule.content_label || `${rule.content_type}:${rule.content_key}`}</strong>
                <span>
                  {rule.institute_name} · {rule.rule_type.replaceAll("_", " ")}
                  {rule.subject_name ? ` · ${rule.subject_name}` : ""}
                </span>
                <span>
                  {rule.required_star_balance != null ? `${rule.required_star_balance} stars` : "No star balance"}
                  {rule.required_entitlement_code ? ` · ${rule.required_entitlement_code}` : ""}
                  {rule.required_score_percentage ? ` · ${rule.required_score_percentage}%` : ""}
                  {` · priority ${rule.priority}`}
                </span>
                <span>Updated {formatDateTime(rule.updated_at)}</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{rule.is_active ? "Active" : "Paused"}</strong>
                <button className="button buttonGhost" onClick={() => loadForEdit(rule)} type="button">
                  Edit
                </button>
              </div>
            </div>
          ))}
          {rules.length === 0 ? <p>No unlock rules exist yet.</p> : null}
        </div>
      </div>
    </article>
  );
}
