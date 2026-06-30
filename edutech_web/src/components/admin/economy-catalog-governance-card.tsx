"use client";

import { useState } from "react";

type EconomyCatalogItem = {
  id: string;
  item_type: string;
  name: string;
  is_active: boolean;
  updated_at: string;
  institute: string | null;
  institute_name: string;
  code: string;
  secondary_label: string;
  metric_label: string;
};

type EconomyCatalogGroup = {
  item_type: string;
  total: number;
  active: number;
  inactive: number;
  items: EconomyCatalogItem[];
};

type EconomyCatalogOverview = {
  reward_rules: EconomyCatalogGroup;
  referral_programs: EconomyCatalogGroup;
  star_packs: EconomyCatalogGroup;
  subscription_plans: EconomyCatalogGroup;
};

const GROUP_COPY: Array<{
  key: keyof EconomyCatalogOverview;
  title: string;
  description: string;
}> = [
  {
    key: "reward_rules",
    title: "Reward rules",
    description: "Control which signup, exam, and performance reward contracts are live.",
  },
  {
    key: "referral_programs",
    title: "Referral programs",
    description: "Keep institute referral campaigns active only when they are operationally intended.",
  },
  {
    key: "star_packs",
    title: "Star packs",
    description: "Gate which one-time wallet purchase options remain available to learners.",
  },
  {
    key: "subscription_plans",
    title: "Subscription plans",
    description: "Control which recurring value lanes are currently offered across institutes.",
  },
];

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

export function EconomyCatalogGovernanceCard({
  initialOverview,
}: {
  initialOverview: EconomyCatalogOverview | null;
}) {
  const [overview, setOverview] = useState<EconomyCatalogOverview | null>(initialOverview);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingKey, setPendingKey] = useState("");

  async function handleToggle(item: EconomyCatalogItem) {
    const nextActive = !item.is_active;
    const key = `${item.item_type}:${item.id}`;
    setPendingKey(key);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/economy/catalog-items/${item.item_type}/${item.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: nextActive }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
        data?: EconomyCatalogItem;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Catalog update failed with status ${response.status}`,
        );
      }

      setMessage(body.message ?? "Economy catalog item updated successfully.");
      setOverview((current) => {
        if (!current || !body.data) return current;

        const targetKey =
          item.item_type === "reward_rule"
            ? "reward_rules"
            : item.item_type === "referral_program"
              ? "referral_programs"
              : item.item_type === "star_pack"
                ? "star_packs"
                : "subscription_plans";
        const group = current[targetKey];
        const previousItem = group.items.find((candidate) => candidate.id === item.id);
        const nextItems = group.items.map((candidate) => (candidate.id === item.id ? body.data! : candidate));
        const wasActive = previousItem?.is_active ?? false;
        const nowActive = body.data.is_active;

        return {
          ...current,
          [targetKey]: {
            ...group,
            active: group.active + (wasActive === nowActive ? 0 : nowActive ? 1 : -1),
            inactive: group.inactive + (wasActive === nowActive ? 0 : nowActive ? -1 : 1),
            items: nextItems,
          },
        };
      });
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update economy catalog item.");
    } finally {
      setPendingKey("");
    }
  }

  if (!overview) {
    return null;
  }

  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Catalog Governance</span>
        <h3>Activate or pause live wallet, referral, and subscription catalog lanes</h3>
        <p className="academicSectionDescription">
          This is the first truthful platform-admin control lane for economy catalog rollout. It does not create new
          products yet, but it does let us safely activate or pause the real rows already driving student flows.
        </p>

        {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
        {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

        <div className="weakTopicStack">
          {GROUP_COPY.map((groupCopy) => {
            const group = overview[groupCopy.key];
            return (
              <div className="featurePlaceholder" key={groupCopy.key}>
                <strong>{groupCopy.title}</strong>
                <p>{groupCopy.description}</p>
                <p>
                  {group.active} active of {group.total} total
                </p>
                <div className="weakTopicStack">
                  {group.items.length > 0 ? (
                    group.items.map((item) => {
                      const actionKey = `${item.item_type}:${item.id}`;
                      return (
                        <div className="weakTopicRow economyCommerceCatalogRow" key={item.id}>
                          <div className="economyCommerceCatalogMain">
                            <strong>{item.name}</strong>
                            <span>{item.institute_name}</span>
                            <span>
                              {item.secondary_label}
                              {item.metric_label ? ` · ${item.metric_label}` : ""}
                            </span>
                            <span>Updated {formatDateTime(item.updated_at)}</span>
                          </div>
                          <div className="weakTopicMeta economyCommerceCatalogMeta">
                            <strong>{item.is_active ? "Active" : "Paused"}</strong>
                            <button
                              className="button buttonGhost"
                              disabled={pendingKey === actionKey}
                              onClick={() => void handleToggle(item)}
                              type="button"
                            >
                              {pendingKey === actionKey
                                ? "Saving..."
                                : item.is_active
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p>No items are currently available in this group.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}
