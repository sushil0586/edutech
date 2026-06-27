"use client";

import { useState } from "react";

type InstituteOption = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type SubscriptionCreditRule = {
  id?: string;
  stars_credited: number;
  credit_on_activation: boolean;
  credit_on_renewal: boolean;
  metadata: Record<string, unknown>;
  is_active: boolean;
};

type SubscriptionCycle = {
  id?: string;
  billing_interval: string;
  interval_count: number;
  price_amount: string;
  currency: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  star_credit_rules: SubscriptionCreditRule[];
};

type AdminSubscriptionPlan = {
  id: string;
  institute: string;
  institute_name: string;
  name: string;
  code: string;
  description: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  cycles: SubscriptionCycle[];
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

function defaultRule(): SubscriptionCreditRule {
  return {
    stars_credited: 500,
    credit_on_activation: true,
    credit_on_renewal: true,
    metadata: {},
    is_active: true,
  };
}

function defaultCycle(): SubscriptionCycle {
  return {
    billing_interval: "monthly",
    interval_count: 1,
    price_amount: "299.00",
    currency: "INR",
    metadata: {},
    is_active: true,
    star_credit_rules: [defaultRule()],
  };
}

export function EconomySubscriptionPlanManagementCard({
  initialPlans,
  institutes,
}: {
  initialPlans: AdminSubscriptionPlan[];
  institutes: InstituteOption[];
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [editingId, setEditingId] = useState("");
  const [instituteId, setInstituteId] = useState(institutes[0]?.id ?? "");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [cycles, setCycles] = useState<SubscriptionCycle[]>([defaultCycle()]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function resetForm() {
    setEditingId("");
    setInstituteId(institutes[0]?.id ?? "");
    setName("");
    setCode("");
    setDescription("");
    setIsActive(true);
    setCycles([defaultCycle()]);
  }

  function loadForEdit(plan: AdminSubscriptionPlan) {
    setEditingId(plan.id);
    setInstituteId(plan.institute);
    setName(plan.name);
    setCode(plan.code);
    setDescription(plan.description);
    setIsActive(plan.is_active);
    setCycles(
      plan.cycles.length > 0
        ? plan.cycles.map((cycle) => ({
            ...cycle,
            star_credit_rules:
              cycle.star_credit_rules.length > 0 ? cycle.star_credit_rules : [defaultRule()],
          }))
        : [defaultCycle()],
    );
    setMessage("");
    setError("");
  }

  function updateCycle(index: number, patch: Partial<SubscriptionCycle>) {
    setCycles((current) => current.map((cycle, cycleIndex) => (cycleIndex === index ? { ...cycle, ...patch } : cycle)));
  }

  function updateRule(cycleIndex: number, ruleIndex: number, patch: Partial<SubscriptionCreditRule>) {
    setCycles((current) =>
      current.map((cycle, currentCycleIndex) => {
        if (currentCycleIndex !== cycleIndex) return cycle;
        return {
          ...cycle,
          star_credit_rules: cycle.star_credit_rules.map((rule, currentRuleIndex) =>
            currentRuleIndex === ruleIndex ? { ...rule, ...patch } : rule,
          ),
        };
      }),
    );
  }

  function addCycle() {
    setCycles((current) => [...current, defaultCycle()]);
  }

  function addRule(cycleIndex: number) {
    setCycles((current) =>
      current.map((cycle, currentCycleIndex) =>
        currentCycleIndex === cycleIndex
          ? { ...cycle, star_credit_rules: [...cycle.star_credit_rules, defaultRule()] }
          : cycle,
      ),
    );
  }

  async function handleSubmit() {
    if (!instituteId || !name.trim() || !code.trim()) {
      setError("Institute, plan name, and plan code are required.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        institute: instituteId,
        name: name.trim(),
        code: code.trim(),
        description: description.trim(),
        metadata: {},
        is_active: isActive,
        cycles: cycles.map((cycle) => ({
          ...(cycle.id ? { id: cycle.id } : {}),
          billing_interval: cycle.billing_interval,
          interval_count: Number(cycle.interval_count),
          price_amount: cycle.price_amount,
          currency: cycle.currency,
          metadata: cycle.metadata ?? {},
          is_active: cycle.is_active,
          star_credit_rules: cycle.star_credit_rules.map((rule) => ({
            ...(rule.id ? { id: rule.id } : {}),
            stars_credited: Number(rule.stars_credited),
            credit_on_activation: rule.credit_on_activation,
            credit_on_renewal: rule.credit_on_renewal,
            metadata: rule.metadata ?? {},
            is_active: rule.is_active,
          })),
        })),
      };

      const response = await fetch(
        editingId ? `/api/admin/economy/subscription-plans/${editingId}` : "/api/admin/economy/subscription-plans",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
        data?: AdminSubscriptionPlan;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Subscription plan save failed with status ${response.status}`,
        );
      }

      if (body.data) {
        setPlans((current) => {
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
          (editingId ? "Subscription plan updated successfully." : "Subscription plan created successfully."),
      );
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save subscription plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Subscription Governance</span>
        <h3>Create and edit recurring plans, cycles, and credit rules</h3>
        <p className="academicSectionDescription">
          This governance lane controls the recurring-value path students see on the subscriptions surface, including
          cycle pricing and the star-credit rules that activate after truthful settlement.
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
            <span>Plan name</span>
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Plan code</span>
            <input type="text" value={code} onChange={(event) => setCode(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Active status</span>
            <select value={isActive ? "yes" : "no"} onChange={(event) => setIsActive(event.target.value === "yes")}>
              <option value="yes">Active</option>
              <option value="no">Paused</option>
            </select>
          </label>
        </div>

        <label className="setupField">
          <span>Description</span>
          <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>

        <div className="weakTopicStack">
          {cycles.map((cycle, cycleIndex) => (
            <div className="featurePlaceholder" key={cycle.id ?? `cycle-${cycleIndex}`}>
              <strong>Cycle {cycleIndex + 1}</strong>
              <div className="setupFormGrid setupFormGridDense">
                <label className="setupField">
                  <span>Billing interval</span>
                  <select
                    value={cycle.billing_interval}
                    onChange={(event) => updateCycle(cycleIndex, { billing_interval: event.target.value })}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <label className="setupField">
                  <span>Interval count</span>
                  <input
                    min="1"
                    type="number"
                    value={cycle.interval_count}
                    onChange={(event) => updateCycle(cycleIndex, { interval_count: Number(event.target.value) })}
                  />
                </label>
                <label className="setupField">
                  <span>Price amount</span>
                  <input
                    min="0.01"
                    step="0.01"
                    type="number"
                    value={cycle.price_amount}
                    onChange={(event) => updateCycle(cycleIndex, { price_amount: event.target.value })}
                  />
                </label>
                <label className="setupField">
                  <span>Currency</span>
                  <input
                    type="text"
                    value={cycle.currency}
                    onChange={(event) => updateCycle(cycleIndex, { currency: event.target.value.toUpperCase() })}
                  />
                </label>
                <label className="setupField">
                  <span>Cycle status</span>
                  <select
                    value={cycle.is_active ? "yes" : "no"}
                    onChange={(event) => updateCycle(cycleIndex, { is_active: event.target.value === "yes" })}
                  >
                    <option value="yes">Active</option>
                    <option value="no">Paused</option>
                  </select>
                </label>
              </div>

              <div className="weakTopicStack">
                {cycle.star_credit_rules.map((rule, ruleIndex) => (
                  <div className="weakTopicRow" key={rule.id ?? `rule-${cycleIndex}-${ruleIndex}`}>
                    <div className="setupFormGrid setupFormGridDense">
                      <label className="setupField">
                        <span>Stars credited</span>
                        <input
                          min="1"
                          type="number"
                          value={rule.stars_credited}
                          onChange={(event) =>
                            updateRule(cycleIndex, ruleIndex, { stars_credited: Number(event.target.value) })
                          }
                        />
                      </label>
                      <label className="setupField">
                        <span>Credit on activation</span>
                        <select
                          value={rule.credit_on_activation ? "yes" : "no"}
                          onChange={(event) =>
                            updateRule(cycleIndex, ruleIndex, { credit_on_activation: event.target.value === "yes" })
                          }
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </label>
                      <label className="setupField">
                        <span>Credit on renewal</span>
                        <select
                          value={rule.credit_on_renewal ? "yes" : "no"}
                          onChange={(event) =>
                            updateRule(cycleIndex, ruleIndex, { credit_on_renewal: event.target.value === "yes" })
                          }
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </label>
                      <label className="setupField">
                        <span>Rule status</span>
                        <select
                          value={rule.is_active ? "yes" : "no"}
                          onChange={(event) => updateRule(cycleIndex, ruleIndex, { is_active: event.target.value === "yes" })}
                        >
                          <option value="yes">Active</option>
                          <option value="no">Paused</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="resultCardActions">
                <button className="button buttonGhost" onClick={() => addRule(cycleIndex)} type="button">
                  Add Credit Rule
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="resultCardActions">
          <button className="button buttonGhost" onClick={addCycle} type="button">
            Add Cycle
          </button>
          <button className="button buttonPrimary" disabled={saving} onClick={() => void handleSubmit()} type="button">
            {saving ? "Saving..." : editingId ? "Update Subscription Plan" : "Create Subscription Plan"}
          </button>
          <button className="button buttonGhost" disabled={saving} onClick={resetForm} type="button">
            Clear Form
          </button>
        </div>

        <div className="weakTopicStack">
          {plans.map((plan) => (
            <div className="weakTopicRow" key={plan.id}>
              <div>
                <strong>{plan.name}</strong>
                <span>
                  {plan.institute_name} · {plan.code}
                </span>
                <span>
                  {plan.cycles.length} cycle{plan.cycles.length === 1 ? "" : "s"} · {plan.description || "No description"}
                </span>
                <span>Updated {formatDateTime(plan.updated_at)}</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{plan.is_active ? "Active" : "Paused"}</strong>
                <button className="button buttonGhost" onClick={() => loadForEdit(plan)} type="button">
                  Edit
                </button>
              </div>
            </div>
          ))}
          {plans.length === 0 ? <p>No subscription plans exist yet.</p> : null}
        </div>
      </div>
    </article>
  );
}
