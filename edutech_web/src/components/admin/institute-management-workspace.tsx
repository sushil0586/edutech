"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { AccountActionButtons } from "@/components/admin/account-action-buttons";

type LocationCatalogOption = {
  country: string;
  states: Array<{
    name: string;
    cities: Array<{
      name: string;
      pincodes: string[];
    }>;
  }>;
};

export type AdminInstituteRecord = {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  website: string;
  description: string;
  is_active: boolean;
  exam_defaults: Record<string, unknown>;
  has_login: boolean;
  login_username: string | null;
  login_is_active: boolean;
  account_user_id: number | null;
};

type InstituteDraft = {
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  website: string;
  description: string;
  is_active: boolean;
};

type InstituteFieldErrors = Partial<
  Record<
    | "name"
    | "code"
    | "email"
    | "phone"
    | "address"
    | "city"
    | "state"
    | "country"
    | "pincode"
    | "website"
    | "description",
    string
  >
>;

type InstituteCounts = {
  studentCount: number;
  teacherCount: number;
  examCount: number;
};

type InstituteLoginOverride = Partial<
  Pick<AdminInstituteRecord, "has_login" | "login_username" | "login_is_active" | "account_user_id">
>;

function firstError(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

function ensureValueInList(options: string[], selectedValue: string) {
  if (!selectedValue) {
    return options;
  }

  return options.includes(selectedValue) ? options : [selectedValue, ...options];
}

function findCountryOption(locationCatalog: LocationCatalogOption[], country: string) {
  return locationCatalog.find(
    (option) => option.country.trim().toLowerCase() === country.trim().toLowerCase(),
  );
}

function findStateOption(locationCatalog: LocationCatalogOption[], country: string, state: string) {
  const countryOption = findCountryOption(locationCatalog, country);
  return countryOption?.states.find(
    (option) => option.name.trim().toLowerCase() === state.trim().toLowerCase(),
  );
}

function findCityOption(
  locationCatalog: LocationCatalogOption[],
  country: string,
  state: string,
  city: string,
) {
  const stateOption = findStateOption(locationCatalog, country, state);
  return stateOption?.cities.find(
    (option) => option.name.trim().toLowerCase() === city.trim().toLowerCase(),
  );
}

function createBlankDraft(): InstituteDraft {
  return {
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    website: "",
    description: "",
    is_active: true,
  };
}

function createDraft(institute: AdminInstituteRecord): InstituteDraft {
  return {
    name: institute.name,
    code: institute.code,
    email: institute.email,
    phone: institute.phone,
    address: institute.address,
    city: institute.city,
    state: institute.state,
    country: institute.country,
    pincode: institute.pincode,
    website: institute.website,
    description: institute.description,
    is_active: institute.is_active,
  };
}

function sanitizePayload(draft: InstituteDraft) {
  return {
    ...draft,
    name: draft.name.trim(),
    code: draft.code.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    address: draft.address.trim(),
    city: draft.city.trim(),
    state: draft.state.trim(),
    country: draft.country.trim(),
    pincode: draft.pincode.trim(),
    website: draft.website.trim(),
    description: draft.description.trim(),
  };
}

function buildFieldErrors(body: Record<string, unknown>) {
  const apiFieldErrors: InstituteFieldErrors = {
    name: firstError(body.name),
    code: firstError(body.code),
    email: firstError(body.email),
    phone: firstError(body.phone),
    address: firstError(body.address),
    city: firstError(body.city),
    state: firstError(body.state),
    country: firstError(body.country),
    pincode: firstError(body.pincode),
    website: firstError(body.website),
    description: firstError(body.description),
  };

  return Object.fromEntries(
    Object.entries(apiFieldErrors).filter(([, value]) => Boolean(value)),
  ) as InstituteFieldErrors;
}

function getApiErrorMessage(body: Record<string, unknown>, fallback: string) {
  if (typeof body.detail === "string") {
    return body.detail;
  }
  if (Array.isArray(body.detail) && body.detail.length > 0) {
    return String(body.detail[0]);
  }
  return fallback;
}

function validateDraft(nextDraft: InstituteDraft) {
  const nextFieldErrors: InstituteFieldErrors = {};
  if (!nextDraft.name.trim()) nextFieldErrors.name = "Institute name is required.";
  if (!nextDraft.code.trim()) nextFieldErrors.code = "Institute code is required.";
  return nextFieldErrors;
}

function InstituteLocationFields({
  draft,
  fieldErrors,
  locationCatalog,
  onCountryChange,
  onStateChange,
  onCityChange,
  onPincodeChange,
}: {
  draft: InstituteDraft;
  fieldErrors: InstituteFieldErrors;
  locationCatalog: LocationCatalogOption[];
  onCountryChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onPincodeChange: (value: string) => void;
}) {
  const availableCountries = useMemo(
    () => locationCatalog.map((option) => option.country),
    [locationCatalog],
  );
  const availableStates = useMemo(
    () => findCountryOption(locationCatalog, draft.country)?.states ?? [],
    [draft.country, locationCatalog],
  );
  const availableStateNames = useMemo(
    () => availableStates.map((option) => option.name),
    [availableStates],
  );
  const availableCities = useMemo(
    () => findStateOption(locationCatalog, draft.country, draft.state)?.cities ?? [],
    [draft.country, draft.state, locationCatalog],
  );
  const availableCityNames = useMemo(
    () => availableCities.map((option) => option.name),
    [availableCities],
  );
  const availablePincodes = useMemo(
    () => findCityOption(locationCatalog, draft.country, draft.state, draft.city)?.pincodes ?? [],
    [draft.city, draft.country, draft.state, locationCatalog],
  );

  const visibleCountries = useMemo(
    () => ensureValueInList(availableCountries, draft.country),
    [availableCountries, draft.country],
  );
  const visibleStates = useMemo(
    () => ensureValueInList(availableStateNames, draft.state),
    [availableStateNames, draft.state],
  );
  const visibleCities = useMemo(
    () => ensureValueInList(availableCityNames, draft.city),
    [availableCityNames, draft.city],
  );
  const visiblePincodes = useMemo(
    () => ensureValueInList(availablePincodes, draft.pincode),
    [availablePincodes, draft.pincode],
  );

  return (
    <>
      <label className="setupField">
        <span>Country</span>
        <select
          aria-invalid={Boolean(fieldErrors.country)}
          className={fieldErrors.country ? "setupFieldInvalid" : undefined}
          value={draft.country}
          onChange={(event) => onCountryChange(event.target.value)}
        >
          <option value="">Select country</option>
          {visibleCountries.map((countryOption) => (
            <option key={countryOption} value={countryOption}>
              {countryOption}
            </option>
          ))}
        </select>
        {fieldErrors.country ? <small className="setupFieldError">{fieldErrors.country}</small> : null}
      </label>

      <label className="setupField">
        <span>State</span>
        <select
          aria-invalid={Boolean(fieldErrors.state)}
          className={fieldErrors.state ? "setupFieldInvalid" : undefined}
          disabled={!draft.country}
          value={draft.state}
          onChange={(event) => onStateChange(event.target.value)}
        >
          <option value="">{draft.country ? "Select state" : "Select country first"}</option>
          {visibleStates.map((stateOption) => (
            <option key={stateOption} value={stateOption}>
              {stateOption}
            </option>
          ))}
        </select>
        {fieldErrors.state ? <small className="setupFieldError">{fieldErrors.state}</small> : null}
      </label>

      <label className="setupField">
        <span>City</span>
        <select
          aria-invalid={Boolean(fieldErrors.city)}
          className={fieldErrors.city ? "setupFieldInvalid" : undefined}
          disabled={!draft.state}
          value={draft.city}
          onChange={(event) => onCityChange(event.target.value)}
        >
          <option value="">{draft.state ? "Select city" : "Select state first"}</option>
          {visibleCities.map((cityOption) => (
            <option key={cityOption} value={cityOption}>
              {cityOption}
            </option>
          ))}
        </select>
        {fieldErrors.city ? <small className="setupFieldError">{fieldErrors.city}</small> : null}
      </label>

      <label className="setupField">
        <span>Pincode</span>
        <select
          aria-invalid={Boolean(fieldErrors.pincode)}
          className={fieldErrors.pincode ? "setupFieldInvalid" : undefined}
          disabled={!draft.city}
          value={draft.pincode}
          onChange={(event) => onPincodeChange(event.target.value)}
        >
          <option value="">{draft.city ? "Select pincode" : "Select city first"}</option>
          {visiblePincodes.map((pincodeOption) => (
            <option key={pincodeOption} value={pincodeOption}>
              {pincodeOption}
            </option>
          ))}
        </select>
        {fieldErrors.pincode ? <small className="setupFieldError">{fieldErrors.pincode}</small> : null}
      </label>
    </>
  );
}

function InstituteFormFields({
  draft,
  fieldErrors,
  locationCatalog,
  updateField,
  handleCountryChange,
  handleStateChange,
  handleCityChange,
}: {
  draft: InstituteDraft;
  fieldErrors: InstituteFieldErrors;
  locationCatalog: LocationCatalogOption[];
  updateField: <Key extends keyof InstituteDraft>(key: Key, value: InstituteDraft[Key]) => void;
  handleCountryChange: (value: string) => void;
  handleStateChange: (value: string) => void;
  handleCityChange: (value: string) => void;
}) {
  return (
    <div className="setupFormGrid setupFormGridDense">
      <label className="setupField">
        <span>Institute name</span>
        <input
          aria-invalid={Boolean(fieldErrors.name)}
          className={fieldErrors.name ? "setupFieldInvalid" : undefined}
          value={draft.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
        {fieldErrors.name ? <small className="setupFieldError">{fieldErrors.name}</small> : null}
      </label>
      <label className="setupField">
        <span>Code</span>
        <input
          aria-invalid={Boolean(fieldErrors.code)}
          className={fieldErrors.code ? "setupFieldInvalid" : undefined}
          value={draft.code}
          onChange={(event) => updateField("code", event.target.value)}
        />
        {fieldErrors.code ? <small className="setupFieldError">{fieldErrors.code}</small> : null}
      </label>
      <label className="setupField">
        <span>Email</span>
        <input
          aria-invalid={Boolean(fieldErrors.email)}
          className={fieldErrors.email ? "setupFieldInvalid" : undefined}
          value={draft.email}
          onChange={(event) => updateField("email", event.target.value)}
        />
        {fieldErrors.email ? <small className="setupFieldError">{fieldErrors.email}</small> : null}
      </label>
      <label className="setupField">
        <span>Phone</span>
        <input
          aria-invalid={Boolean(fieldErrors.phone)}
          className={fieldErrors.phone ? "setupFieldInvalid" : undefined}
          value={draft.phone}
          onChange={(event) => updateField("phone", event.target.value)}
        />
        {fieldErrors.phone ? <small className="setupFieldError">{fieldErrors.phone}</small> : null}
      </label>

      <InstituteLocationFields
        draft={draft}
        fieldErrors={fieldErrors}
        locationCatalog={locationCatalog}
        onCountryChange={handleCountryChange}
        onStateChange={handleStateChange}
        onCityChange={handleCityChange}
        onPincodeChange={(value) => updateField("pincode", value)}
      />

      <label className="setupField">
        <span>Website</span>
        <input
          aria-invalid={Boolean(fieldErrors.website)}
          className={fieldErrors.website ? "setupFieldInvalid" : undefined}
          value={draft.website}
          onChange={(event) => updateField("website", event.target.value)}
        />
        {fieldErrors.website ? <small className="setupFieldError">{fieldErrors.website}</small> : null}
      </label>
      <label className="setupField setupFieldFull">
        <span>Address</span>
        <textarea
          aria-invalid={Boolean(fieldErrors.address)}
          className={fieldErrors.address ? "setupFieldInvalid" : undefined}
          rows={3}
          value={draft.address}
          onChange={(event) => updateField("address", event.target.value)}
        />
        {fieldErrors.address ? <small className="setupFieldError">{fieldErrors.address}</small> : null}
      </label>
      <label className="setupField setupFieldFull">
        <span>Description</span>
        <textarea
          aria-invalid={Boolean(fieldErrors.description)}
          className={fieldErrors.description ? "setupFieldInvalid" : undefined}
          rows={4}
          value={draft.description}
          onChange={(event) => updateField("description", event.target.value)}
        />
        {fieldErrors.description ? <small className="setupFieldError">{fieldErrors.description}</small> : null}
      </label>
      <label className="setupToggle setupToggleWide">
        <input
          checked={draft.is_active}
          onChange={(event) => updateField("is_active", event.target.checked)}
          type="checkbox"
        />
        <span>
          Institute is active
          <small>Inactive institutes stay visible but are clearly marked for governance review.</small>
        </span>
      </label>
    </div>
  );
}

function InstituteModal({
  title,
  subtitle,
  draft,
  fieldErrors,
  locationCatalog,
  onClose,
  onSubmit,
  saving,
  message,
  error,
  updateField,
  handleCountryChange,
  handleStateChange,
  handleCityChange,
}: {
  title: string;
  subtitle: string;
  draft: InstituteDraft;
  fieldErrors: InstituteFieldErrors;
  locationCatalog: LocationCatalogOption[];
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  message: string;
  error: string;
  updateField: <Key extends keyof InstituteDraft>(key: Key, value: InstituteDraft[Key]) => void;
  handleCountryChange: (value: string) => void;
  handleStateChange: (value: string) => void;
  handleCityChange: (value: string) => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="adminInstituteModalOverlay" onClick={onClose} role="presentation">
      <div
        aria-labelledby="admin-institute-modal-title"
        aria-modal="true"
        className="adminInstituteModal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="adminInstituteModalHeader">
          <div>
            <span className="studentDashboardTag">Institute Form</span>
            <h3 id="admin-institute-modal-title">{title}</h3>
            <p>{subtitle}</p>
          </div>
          <button className="button buttonGhost" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
        {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

        <div className="adminInstituteModalBody">
          <InstituteFormFields
            draft={draft}
            fieldErrors={fieldErrors}
            handleCityChange={handleCityChange}
            handleCountryChange={handleCountryChange}
            handleStateChange={handleStateChange}
            locationCatalog={locationCatalog}
            updateField={updateField}
          />
        </div>

        <div className="adminInstituteModalFooter">
          <button className="button buttonPrimary" disabled={saving} onClick={onSubmit} type="button">
            {saving ? "Saving..." : "Save Institute"}
          </button>
          <button className="button buttonGhost" disabled={saving} onClick={onClose} type="button">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function InstituteManagementWorkspace({
  institute,
  institutes,
  locationCatalog,
  selectedInstituteId,
  counts,
}: {
  institute: AdminInstituteRecord | null;
  institutes: AdminInstituteRecord[];
  locationCatalog: LocationCatalogOption[];
  selectedInstituteId: string | null;
  counts: InstituteCounts;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);

  const [createDraftState, setCreateDraftState] = useState<InstituteDraft>(createBlankDraft);
  const [createMessage, setCreateMessage] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createFieldErrors, setCreateFieldErrors] = useState<InstituteFieldErrors>({});

  const [draft, setDraft] = useState<InstituteDraft>(createBlankDraft);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<InstituteFieldErrors>({});
  const [loginOverrides, setLoginOverrides] = useState<Record<string, InstituteLoginOverride>>({});

  const mergedInstitutes = useMemo(
    () =>
      institutes.map((item) => ({
        ...item,
        ...(loginOverrides[item.id] ?? {}),
      })),
    [institutes, loginOverrides],
  );
  const mergedInstitute = useMemo(() => {
    if (!institute) {
      return null;
    }
    return {
      ...institute,
      ...(loginOverrides[institute.id] ?? {}),
    };
  }, [institute, loginOverrides]);

  const filteredInstitutes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return mergedInstitutes
      .filter((item) => (showActiveOnly ? item.is_active : true))
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        const searchable = [
          item.name,
          item.code,
          item.city,
          item.state,
          item.country,
          item.email,
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (left.is_active !== right.is_active) {
          return left.is_active ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      });
  }, [mergedInstitutes, query, showActiveOnly]);
  const activeInstituteCount = useMemo(
    () => mergedInstitutes.filter((item) => item.is_active).length,
    [mergedInstitutes],
  );

  function handleInstituteAccountAction(
    targetInstituteId: string,
    action: "create-login" | "reset-password" | "enable" | "disable",
    result: { user_id?: number; username?: string; is_active?: boolean },
  ) {
    setLoginOverrides((current) => {
      const previous = current[targetInstituteId] ?? {};
      let next: InstituteLoginOverride = previous;

      if (action === "create-login") {
        next = {
          ...previous,
          has_login: true,
          login_username: result.username ?? previous.login_username ?? null,
          login_is_active: true,
          account_user_id: result.user_id ?? previous.account_user_id ?? null,
        };
      } else if (action === "enable") {
        next = {
          ...previous,
          has_login: true,
          login_is_active: true,
        };
      } else if (action === "disable") {
        next = {
          ...previous,
          has_login: true,
          login_is_active: false,
        };
      } else if (action === "reset-password") {
        next = {
          ...previous,
          has_login: true,
          login_username: result.username ?? previous.login_username ?? null,
        };
      }

      return { ...current, [targetInstituteId]: next };
    });
  }

  function updateField<Key extends keyof InstituteDraft>(key: Key, value: InstituteDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  }

  function updateCreateField<Key extends keyof InstituteDraft>(key: Key, value: InstituteDraft[Key]) {
    setCreateDraftState((current) => ({ ...current, [key]: value }));
    setCreateFieldErrors((current) => ({ ...current, [key]: "" }));
  }

  function handleLocationChange(
    updateDraft: Dispatch<SetStateAction<InstituteDraft>>,
    clearErrors: Dispatch<SetStateAction<InstituteFieldErrors>>,
    mode: "country" | "state" | "city",
    nextValue: string,
  ) {
    if (mode === "country") {
      updateDraft((current) => {
        const nextStates = findCountryOption(locationCatalog, nextValue)?.states ?? [];
        const stateStillValid = nextStates.some((option) => option.name === current.state);
        if (!stateStillValid) {
          return { ...current, country: nextValue, state: "", city: "", pincode: "" };
        }

        const nextCities = findStateOption(locationCatalog, nextValue, current.state)?.cities ?? [];
        const cityStillValid = nextCities.some((option) => option.name === current.city);
        if (!cityStillValid) {
          return { ...current, country: nextValue, city: "", pincode: "" };
        }

        const nextPincodes =
          findCityOption(locationCatalog, nextValue, current.state, current.city)?.pincodes ?? [];
        return {
          ...current,
          country: nextValue,
          pincode: nextPincodes.includes(current.pincode) ? current.pincode : (nextPincodes[0] ?? ""),
        };
      });
      clearErrors((current) => ({ ...current, country: "", state: "", city: "", pincode: "" }));
      return;
    }

    if (mode === "state") {
      updateDraft((current) => {
        const nextCities = findStateOption(locationCatalog, current.country, nextValue)?.cities ?? [];
        const cityStillValid = nextCities.some((option) => option.name === current.city);
        if (!cityStillValid) {
          return { ...current, state: nextValue, city: "", pincode: "" };
        }

        const nextPincodes =
          findCityOption(locationCatalog, current.country, nextValue, current.city)?.pincodes ?? [];
        return {
          ...current,
          state: nextValue,
          pincode: nextPincodes.includes(current.pincode) ? current.pincode : (nextPincodes[0] ?? ""),
        };
      });
      clearErrors((current) => ({ ...current, state: "", city: "", pincode: "" }));
      return;
    }

    updateDraft((current) => {
      const nextPincodes =
        findCityOption(locationCatalog, current.country, current.state, nextValue)?.pincodes ?? [];
      return {
        ...current,
        city: nextValue,
        pincode: nextPincodes[0] ?? "",
      };
    });
    clearErrors((current) => ({ ...current, city: "", pincode: "" }));
  }

  function resetCreateState() {
    setCreateDraftState(createBlankDraft());
    setCreateFieldErrors({});
    setCreateError("");
    setCreateMessage("");
  }

  function closeCreateModal() {
    setModalMode(null);
    resetCreateState();
  }

  function closeEditModal() {
    setModalMode(null);
    setDraft(institute ? createDraft(institute) : createBlankDraft());
    setFieldErrors({});
    setError("");
    setMessage("");
  }

  async function createInstitute() {
    const nextFieldErrors = validateDraft(createDraftState);
    if (Object.keys(nextFieldErrors).length > 0) {
      setCreateFieldErrors(nextFieldErrors);
      setCreateMessage("");
      setCreateError("Fill the required fields to continue.");
      return;
    }

    setCreating(true);
    setCreateMessage("");
    setCreateError("");
    setCreateFieldErrors({});

    try {
      const response = await fetch("/api/admin/institutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizePayload(createDraftState)),
      });

      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        setCreateFieldErrors(buildFieldErrors(body));
        throw new Error(
          getApiErrorMessage(body, "Institute could not be created. Review the highlighted fields."),
        );
      }

      const createdInstitute = body as unknown as AdminInstituteRecord;
      closeCreateModal();
      router.push(`/admin/institutes?institute=${createdInstitute.id}`);
      router.refresh();
    } catch (saveError) {
      setCreateError(
        saveError instanceof Error && saveError.message
          ? saveError.message
          : "Unable to create institute right now.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function saveInstitute() {
    if (!institute) {
      return;
    }

    const nextFieldErrors = validateDraft(draft);
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setMessage("");
      setError("Fill the required fields to continue.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");
    setFieldErrors({});

    try {
      const response = await fetch(`/api/admin/institutes/${institute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizePayload(draft)),
      });

      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        setFieldErrors(buildFieldErrors(body));
        throw new Error(
          getApiErrorMessage(body, "Institute could not be updated. Review the highlighted fields."),
        );
      }

      closeEditModal();
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error && saveError.message
          ? saveError.message
          : "Unable to update institute right now.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(nextInstitute?: AdminInstituteRecord | null) {
    const targetInstitute = nextInstitute ?? institute;
    if (!targetInstitute) {
      return;
    }

    setDraft(createDraft(targetInstitute));
    setFieldErrors({});
    setError("");
    setMessage("");
    setModalMode("edit");
  }

  return (
    <section className="adminInstituteWorkspace">
      <div className="adminInstituteToolbar contentCard">
        <div>
          <div className="adminInstituteToolbarStats">
            <span>{mergedInstitutes.length} total</span>
            <span>{activeInstituteCount} active</span>
            <span>{filteredInstitutes.length} visible</span>
          </div>
        </div>
        <div className="adminInstituteToolbarActions">
          <input
            className="adminInstituteSearch"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, code, city, or email"
            type="search"
            value={query}
          />
          <label className="setupToggle adminInstituteFilterToggle">
            <input
              checked={showActiveOnly}
              onChange={(event) => setShowActiveOnly(event.target.checked)}
              type="checkbox"
            />
            <span>
              Active only
              <small>Hide inactive records from the table.</small>
            </span>
          </label>
          <button className="button buttonPrimary" onClick={() => setModalMode("create")} type="button">
            Add Institute
          </button>
          <button
            className="button buttonSecondary"
            disabled={!mergedInstitute}
            onClick={() => openEditModal()}
            type="button"
          >
            Edit Selected
          </button>
        </div>
      </div>

      <div className="adminInstituteLayout">
        <article className="contentCard adminInstituteTableCard">
          <div className="sectionHeading">
            <strong>Institutes</strong>
            <span>{filteredInstitutes.length} records</span>
          </div>

          {filteredInstitutes.length ? (
            <div className="adminInstituteTableWrap">
              <table className="adminInstituteTable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Location</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Login</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredInstitutes.map((item) => {
                    const isSelected = item.id === selectedInstituteId;
                    return (
                      <tr
                        className={isSelected ? "adminInstituteTableRowSelected" : undefined}
                        key={item.id}
                        onClick={() => router.push(`/admin/institutes?institute=${item.id}`)}
                      >
                        <td>
                          <strong>{item.name}</strong>
                          <small>{item.website || "No website set"}</small>
                        </td>
                        <td>{item.code}</td>
                        <td>
                          {item.city || "NA"}, {item.state || "NA"}
                          <small>{item.country || "No country"}</small>
                        </td>
                        <td>
                          {item.email || "No email"}
                          <small>{item.phone || "No phone"}</small>
                        </td>
                        <td>
                          <span className={item.is_active ? "statusPill statusLive" : "statusPill statusWarning"}>
                            {item.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="adminPeopleRosterStatusStack">
                            <span className={item.has_login ? "statusPill statusLive" : "statusPill statusWarning"}>
                              {item.has_login ? "Access ready" : "No login"}
                            </span>
                            {item.has_login ? (
                              <small>{item.login_username || "Linked institute admin"}</small>
                            ) : (
                              <small>No institute admin account linked</small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="adminInstituteRowActions">
                            <button
                              className="button buttonGhost"
                              onClick={() => router.push(`/admin/institutes?institute=${item.id}`)}
                              type="button"
                            >
                              View
                            </button>
                            <button
                              className="button buttonGhost"
                              onClick={() => {
                                router.push(`/admin/institutes?institute=${item.id}`);
                                openEditModal(item);
                              }}
                              type="button"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="featurePlaceholder">
              <p>No institutes matched the current filter.</p>
            </div>
          )}
        </article>

        <article className="contentCard adminInstituteDetailCard">
          <div className="sectionHeading">
            <strong>{mergedInstitute ? mergedInstitute.name : "Selected institute"}</strong>
            <span>{mergedInstitute ? mergedInstitute.code : "Choose a record"}</span>
          </div>

          {mergedInstitute ? (
            <>
              <div className="adminInstituteDetailHero">
                <div>
                  <span className="studentDashboardTag">Selected profile</span>
                  <h4>{mergedInstitute.name}</h4>
                  {mergedInstitute.description ? <p>{mergedInstitute.description}</p> : null}
                </div>
                <span className={mergedInstitute.is_active ? "statusPill statusLive" : "statusPill statusWarning"}>
                  {mergedInstitute.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="adminInstituteDetailGrid">
                <div className="studentResultStat">
                  <span>Status</span>
                  <strong>{mergedInstitute.is_active ? "Active" : "Inactive"}</strong>
                </div>
                <div className="studentResultStat">
                  <span>Students</span>
                  <strong>{counts.studentCount}</strong>
                </div>
                <div className="studentResultStat">
                  <span>Teachers</span>
                  <strong>{counts.teacherCount}</strong>
                </div>
                <div className="studentResultStat">
                  <span>Exams</span>
                  <strong>{counts.examCount}</strong>
                </div>
                <div className="studentResultStat">
                  <span>Location</span>
                  <strong>{mergedInstitute.city || "NA"}</strong>
                </div>
                <div className="studentResultStat">
                  <span>Defaults</span>
                  <strong>{Object.keys(mergedInstitute.exam_defaults ?? {}).length}</strong>
                </div>
              </div>

              <div className="adminInstituteInfoList">
                <div className="adminInstituteAccountPanel">
                  <div className="weakTopicRow">
                    <div>
                      <strong>Institute admin login</strong>
                      <span>Credential controls for the linked institute administrator account</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{mergedInstitute.login_username || "No linked login"}</strong>
                      <span>
                        {mergedInstitute.has_login
                          ? mergedInstitute.login_is_active
                            ? "Login active"
                            : "Login disabled"
                          : "No institute admin account is linked to this institute yet"}
                      </span>
                    </div>
                  </div>
                  <AccountActionButtons
                    entityId={mergedInstitute.id}
                    hasLogin={mergedInstitute.has_login}
                    loginIsActive={mergedInstitute.login_is_active}
                    onActionComplete={(action, result) =>
                      handleInstituteAccountAction(mergedInstitute.id, action, result)
                    }
                    resource="institutes"
                    userId={mergedInstitute.account_user_id}
                  />
                </div>

                <div className="weakTopicRow">
                  <div>
                    <strong>Email</strong>
                    <span>Primary operational contact</span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{mergedInstitute.email || "Not set"}</strong>
                  </div>
                </div>
                <div className="weakTopicRow">
                  <div>
                    <strong>Phone</strong>
                    <span>Administrative contact number</span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{mergedInstitute.phone || "Not set"}</strong>
                  </div>
                </div>
                <div className="weakTopicRow">
                  <div>
                    <strong>Address</strong>
                    <span>Governed address and geography</span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{mergedInstitute.address || "Not set"}</strong>
                    <span>
                      {[mergedInstitute.city, mergedInstitute.state, mergedInstitute.country, mergedInstitute.pincode]
                        .filter(Boolean)
                        .join(", ") || "Location details missing"}
                    </span>
                  </div>
                </div>
                <div className="weakTopicRow">
                  <div>
                    <strong>Description</strong>
                    <span>Operational context for this institute</span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{mergedInstitute.description || "No description set"}</strong>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="featurePlaceholder">
              <p>Select an institute from the table to inspect details and edit it.</p>
            </div>
          )}
        </article>
      </div>

      {modalMode === "create" ? (
        <InstituteModal
          draft={createDraftState}
          error={createError}
          fieldErrors={createFieldErrors}
          handleCityChange={(value) =>
            handleLocationChange(setCreateDraftState, setCreateFieldErrors, "city", value)
          }
          handleCountryChange={(value) =>
            handleLocationChange(setCreateDraftState, setCreateFieldErrors, "country", value)
          }
          handleStateChange={(value) =>
            handleLocationChange(setCreateDraftState, setCreateFieldErrors, "state", value)
          }
          locationCatalog={locationCatalog}
          message={createMessage}
          onClose={closeCreateModal}
          onSubmit={createInstitute}
          saving={creating}
          subtitle="Create a new institute without crowding the main page."
          title="Add Institute"
          updateField={updateCreateField}
        />
      ) : null}

      {modalMode === "edit" && institute ? (
        <InstituteModal
          draft={draft}
          error={error}
          fieldErrors={fieldErrors}
          handleCityChange={(value) => handleLocationChange(setDraft, setFieldErrors, "city", value)}
          handleCountryChange={(value) =>
            handleLocationChange(setDraft, setFieldErrors, "country", value)
          }
          handleStateChange={(value) => handleLocationChange(setDraft, setFieldErrors, "state", value)}
          locationCatalog={locationCatalog}
          message={message}
          onClose={closeEditModal}
          onSubmit={saveInstitute}
          saving={saving}
          subtitle="Update identity, contact, and geography in one focused popup."
          title={`Edit ${institute.name}`}
          updateField={updateField}
        />
      ) : null}
    </section>
  );
}
