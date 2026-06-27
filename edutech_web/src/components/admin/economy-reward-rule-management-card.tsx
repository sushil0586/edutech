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
  name: string;
  institute: string;
  is_active: boolean;
};

type AdminRewardRule = {
  id: string;
  institute: string;
  institute_name: string;
  subject: string | null;
  subject_name: string | null;
  name: string;
  rule_type: string;
  stars_awarded: number;
  score_threshold_percentage: string | null;
  completion_count_threshold: number | null;
  streak_count_threshold: number | null;
  priority: number;
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

export function EconomyRewardRuleManagementCard({
  initialRules,
  institutes,
  subjects,
}: {
  initialRules: AdminRewardRule[];
  institutes: InstituteOption[];
  subjects: SubjectOption[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [editingId, setEditingId] = useState("");
  const [instituteId, setInstituteId] = useState(institutes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState("");
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState("signup");
  const [starsAwarded, setStarsAwarded] = useState("100");
  const [scoreThresholdPercentage, setScoreThresholdPercentage] = useState("");
  const [completionCountThreshold, setCompletionCountThreshold] = useState("");
  const [streakCountThreshold, setStreakCountThreshold] = useState("");
  const [priority, setPriority] = useState("100");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredSubjects = subjects.filter((subject) => subject.institute === instituteId);

  function resetForm() {
    setEditingId("");
    setInstituteId(institutes[0]?.id ?? "");
    setSubjectId("");
    setName("");
    setRuleType("signup");
    setStarsAwarded("100");
    setScoreThresholdPercentage("");
    setCompletionCountThreshold("");
    setStreakCountThreshold("");
    setPriority("100");
    setValidFrom("");
    setValidUntil("");
    setIsActive(true);
  }

  function loadForEdit(rule: AdminRewardRule) {
    setEditingId(rule.id);
    setInstituteId(rule.institute);
    setSubjectId(rule.subject ?? "");
    setName(rule.name);
    setRuleType(rule.rule_type);
    setStarsAwarded(String(rule.stars_awarded));
    setScoreThresholdPercentage(rule.score_threshold_percentage ?? "");
    setCompletionCountThreshold(
      rule.completion_count_threshold != null ? String(rule.completion_count_threshold) : "",
    );
    setStreakCountThreshold(
      rule.streak_count_threshold != null ? String(rule.streak_count_threshold) : "",
    );
    setPriority(String(rule.priority));
    setValidFrom(toInputDateTime(rule.valid_from));
    setValidUntil(toInputDateTime(rule.valid_until));
    setIsActive(rule.is_active);
    setMessage("");
    setError("");
  }

  async function handleSubmit() {
    if (!instituteId || !name.trim()) {
      setError("Institute and reward rule name are required.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        editingId ? `/api/admin/economy/reward-rules/${editingId}` : "/api/admin/economy/reward-rules",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            institute: instituteId,
            subject: subjectId || null,
            name: name.trim(),
            rule_type: ruleType,
            stars_awarded: Number(starsAwarded),
            score_threshold_percentage: scoreThresholdPercentage || null,
            completion_count_threshold: completionCountThreshold ? Number(completionCountThreshold) : null,
            streak_count_threshold: streakCountThreshold ? Number(streakCountThreshold) : null,
            priority: Number(priority),
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
        data?: AdminRewardRule;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Reward rule save failed with status ${response.status}`,
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
            return a.name.localeCompare(b.name);
          });
        });
      }

      setMessage(body.message ?? (editingId ? "Reward rule updated successfully." : "Reward rule created successfully."));
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save reward rule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Reward Governance</span>
        <h3>Create and edit reward rules for signup, completion, and score ladders</h3>
        <p className="academicSectionDescription">
          This lane controls the reward contracts that translate learning events into wallet credits, including scoped
          subject rewards and score-threshold ladders.
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
            <span>Rule name</span>
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Rule type</span>
            <select value={ruleType} onChange={(event) => setRuleType(event.target.value)}>
              <option value="signup">Signup</option>
              <option value="exam_completion">Exam completion</option>
              <option value="score_threshold">Score threshold</option>
              <option value="streak">Streak</option>
              <option value="topic_mastery">Topic mastery</option>
              <option value="admin_campaign">Admin campaign</option>
            </select>
          </label>
          <label className="setupField">
            <span>Stars awarded</span>
            <input min="1" type="number" value={starsAwarded} onChange={(event) => setStarsAwarded(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Priority</span>
            <input min="0" type="number" value={priority} onChange={(event) => setPriority(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Score threshold %</span>
            <input
              min="0"
              max="100"
              step="0.01"
              type="number"
              value={scoreThresholdPercentage}
              onChange={(event) => setScoreThresholdPercentage(event.target.value)}
            />
          </label>
          <label className="setupField">
            <span>Completion count threshold</span>
            <input
              min="1"
              type="number"
              value={completionCountThreshold}
              onChange={(event) => setCompletionCountThreshold(event.target.value)}
            />
          </label>
          <label className="setupField">
            <span>Streak count threshold</span>
            <input
              min="1"
              type="number"
              value={streakCountThreshold}
              onChange={(event) => setStreakCountThreshold(event.target.value)}
            />
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
            {saving ? "Saving..." : editingId ? "Update Reward Rule" : "Create Reward Rule"}
          </button>
          <button className="button buttonGhost" disabled={saving} onClick={resetForm} type="button">
            Clear Form
          </button>
        </div>

        <div className="weakTopicStack">
          {rules.map((rule) => (
            <div className="weakTopicRow" key={rule.id}>
              <div>
                <strong>{rule.name}</strong>
                <span>
                  {rule.institute_name} · {rule.rule_type.replaceAll("_", " ")}
                  {rule.subject_name ? ` · ${rule.subject_name}` : ""}
                </span>
                <span>
                  {rule.stars_awarded} stars · priority {rule.priority}
                  {rule.score_threshold_percentage ? ` · ${rule.score_threshold_percentage}%` : ""}
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
          {rules.length === 0 ? <p>No reward rules exist yet.</p> : null}
        </div>
      </div>
    </article>
  );
}
