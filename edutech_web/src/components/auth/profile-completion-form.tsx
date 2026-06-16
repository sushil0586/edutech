"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { PendingButton } from "@/components/ui/pending-button";
import { completeProfileAction } from "@/lib/auth/actions";
import { fetchLocationPrefill } from "@/lib/auth/location-prefill";
import { initialProfileCompletionActionState } from "@/lib/auth/profile-completion-state";
import type { AccountProfile, RegistrationOptions } from "@/lib/auth/session";

type ProfileCompletionFormProps = {
  profile: AccountProfile;
  registrationOptions: RegistrationOptions;
};

function getString(source: Record<string, unknown> | undefined, key: string, fallback = "") {
  const value = source?.[key];
  return typeof value === "string" ? value : fallback;
}

function getStringArray(source: Record<string, unknown> | undefined, key: string) {
  const value = source?.[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function getReadableFieldLabel(field: string) {
  if (field === "__all__" || field === "non_field_errors" || field === "detail") {
    return "General";
  }

  return field.replaceAll("_", " ");
}

function ensureValueInList(options: string[], selectedValue: string) {
  if (!selectedValue) {
    return options;
  }

  return options.includes(selectedValue) ? options : [selectedValue, ...options];
}

function clampClassBand(classLevel: string) {
  const parsed = Number(classLevel);
  if (!Number.isFinite(parsed)) {
    return "middleSchool" as const;
  }
  if (parsed <= 5) return "foundation" as const;
  if (parsed <= 8) return "middleSchool" as const;
  if (parsed <= 10) return "board" as const;
  return "senior" as const;
}

function buildTeacherSubjectOptions(subjectCatalog: RegistrationOptions["subject_catalog"]) {
  return Array.from(
    new Set(
      Object.values(subjectCatalog)
        .flat()
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function findCountryOption(
  locationCatalog: RegistrationOptions["location_catalog"],
  country: string,
) {
  return locationCatalog.find(
    (option) => option.country.trim().toLowerCase() === country.trim().toLowerCase(),
  );
}

function findStateOption(
  locationCatalog: RegistrationOptions["location_catalog"],
  country: string,
  state: string,
) {
  const countryOption = findCountryOption(locationCatalog, country);
  return countryOption?.states.find(
    (option) => option.name.trim().toLowerCase() === state.trim().toLowerCase(),
  );
}

function findCityOption(
  locationCatalog: RegistrationOptions["location_catalog"],
  country: string,
  state: string,
  city: string,
) {
  const stateOption = findStateOption(locationCatalog, country, state);
  return stateOption?.cities.find(
    (option) => option.name.trim().toLowerCase() === city.trim().toLowerCase(),
  );
}

function resolveCountryOption(
  locationCatalog: RegistrationOptions["location_catalog"],
  value: string,
) {
  return findCountryOption(locationCatalog, value)?.country ?? value;
}

function resolveStateValue(
  locationCatalog: RegistrationOptions["location_catalog"],
  country: string,
  value: string,
) {
  return findStateOption(locationCatalog, country, value)?.name ?? value;
}

function resolveCityValue(
  locationCatalog: RegistrationOptions["location_catalog"],
  country: string,
  state: string,
  value: string,
) {
  return findCityOption(locationCatalog, country, state, value)?.name ?? value;
}

function resolvePincodeValue(
  locationCatalog: RegistrationOptions["location_catalog"],
  country: string,
  state: string,
  city: string,
  value: string,
) {
  const cityOption = findCityOption(locationCatalog, country, state, city);
  if (!cityOption) {
    return value;
  }

  return cityOption.pincodes.includes(value) ? value : (cityOption.pincodes[0] ?? value);
}

function getRoleCompletionBadge(role: AccountProfile["role"]) {
  if (role === "student") {
    return "Learner lane";
  }
  if (role === "teacher") {
    return "Teaching lane";
  }
  return "Family lane";
}

function getRoleCompletionSummary(role: AccountProfile["role"]) {
  if (role === "student") {
    return "Class, board, exam focus, and subject interests";
  }
  if (role === "teacher") {
    return "Teaching focus, academic scope, and profile defaults";
  }
  return "Child academic details, family focus, and reporting defaults";
}

export function ProfileCompletionForm({
  profile,
  registrationOptions,
}: ProfileCompletionFormProps) {
  const [state, formAction] = useActionState(
    completeProfileAction,
    initialProfileCompletionActionState,
  );
  const locationCatalog = useMemo(
    () => registrationOptions.location_catalog ?? [],
    [registrationOptions.location_catalog],
  );
  const registrationContext = (profile.registration_context ?? {}) as Record<string, unknown>;
  const detectedLocation = (profile.location_context ?? {}) as Record<string, unknown>;
  const initialCountryRaw =
    getString(registrationContext, "country") || getString(detectedLocation, "detected_country");
  const initialCountry = resolveCountryOption(locationCatalog, initialCountryRaw);
  const initialStateRaw =
    getString(registrationContext, "state") || getString(detectedLocation, "detected_state");
  const initialState = resolveStateValue(locationCatalog, initialCountry, initialStateRaw);
  const initialCityRaw =
    getString(registrationContext, "city") || getString(detectedLocation, "detected_city");
  const initialCity = resolveCityValue(locationCatalog, initialCountry, initialState, initialCityRaw);
  const initialPincodeRaw =
    getString(registrationContext, "pincode") || getString(detectedLocation, "detected_pincode");
  const initialPincode = resolvePincodeValue(
    locationCatalog,
    initialCountry,
    initialState,
    initialCity,
    initialPincodeRaw,
  );

  const [schoolCode, setSchoolCode] = useState(getString(registrationContext, "school_code"));
  const [phone] = useState(getString(registrationContext, "phone"));
  const [country, setCountry] = useState(initialCountry);
  const [stateValue, setStateValue] = useState(initialState);
  const [city, setCity] = useState(initialCity);
  const [pincode, setPincode] = useState(initialPincode);
  const [timezone, setTimezone] = useState(
    getString(registrationContext, "timezone") ||
      getString(detectedLocation, "detected_timezone") ||
      (typeof Intl === "undefined" ? "" : (Intl.DateTimeFormat().resolvedOptions().timeZone ?? "")),
  );
  const [studentClassLevel, setStudentClassLevel] = useState(getString(registrationContext, "class_level", "7"));
  const [studentBoard, setStudentBoard] = useState(
    getString(registrationContext, "board", registrationOptions.boards[0] ?? "CBSE"),
  );
  const [studentFocus, setStudentFocus] = useState(
    getString(registrationContext, "exam_interest", registrationOptions.student_exam_interests[0] ?? ""),
  );
  const [parentChildClass, setParentChildClass] = useState(
    getString(registrationContext, "child_class_level", "10"),
  );
  const [parentChildBoard, setParentChildBoard] = useState(
    getString(registrationContext, "child_board", registrationOptions.boards[0] ?? "CBSE"),
  );
  const [parentFocus, setParentFocus] = useState(
    getString(registrationContext, "parent_focus", registrationOptions.parent_focus_options[0] ?? ""),
  );
  const [teacherFocus, setTeacherFocus] = useState(
    getString(registrationContext, "teaching_focus", registrationOptions.teacher_focus_options[0] ?? ""),
  );

  const teacherSubjectOptions = useMemo(
    () => buildTeacherSubjectOptions(registrationOptions.subject_catalog),
    [registrationOptions.subject_catalog],
  );
  const studentBand = clampClassBand(studentClassLevel);
  const suggestedStudentSubjects = useMemo(
    () =>
      registrationOptions.subject_catalog[studentBand] ??
      registrationOptions.subject_catalog.middleSchool ??
      [],
    [registrationOptions.subject_catalog, studentBand],
  );
  const suggestedStudentExams = useMemo(
    () =>
      registrationOptions.exam_catalog[studentBand] ?? registrationOptions.student_exam_interests,
    [registrationOptions.exam_catalog, registrationOptions.student_exam_interests, studentBand],
  );

  const [studentSubjects, setStudentSubjects] = useState<string[]>(() => {
    const fromRegistration = getStringArray(registrationContext, "subject_interests");
    return fromRegistration.length > 0 ? fromRegistration : suggestedStudentSubjects;
  });
  const [teacherScope, setTeacherScope] = useState<string[]>(() => {
    const fromRegistration = getStringArray(registrationContext, "teaching_scope");
    return fromRegistration.length > 0 ? fromRegistration : teacherSubjectOptions.slice(0, 4);
  });

  useEffect(() => {
    if (country && stateValue && city && pincode) {
      return;
    }

    let isCancelled = false;

    async function loadLocationPrefill() {
      const result = await fetchLocationPrefill();
      if (isCancelled || !result.available || !result.detected) {
        return;
      }

      const nextCountry = resolveCountryOption(locationCatalog, result.detected.country);
      const nextState = resolveStateValue(locationCatalog, nextCountry, result.detected.state);
      const nextCity = resolveCityValue(locationCatalog, nextCountry, nextState, result.detected.city);
      const nextPincode = resolvePincodeValue(
        locationCatalog,
        nextCountry,
        nextState,
        nextCity,
        result.detected.pincode,
      );

      if (!country && nextCountry) {
        setCountry(nextCountry);
      }
      if (!stateValue && nextState) {
        setStateValue(nextState);
      }
      if (!city && nextCity) {
        setCity(nextCity);
      }
      if (!pincode && nextPincode) {
        setPincode(nextPincode);
      }
      if (!timezone && result.detected.timezone) {
        setTimezone(result.detected.timezone);
      }
    }

    void loadLocationPrefill();

    return () => {
      isCancelled = true;
    };
  }, [city, country, locationCatalog, pincode, stateValue, timezone]);

  const roleTitle =
    profile.role === "student"
      ? "Student profile"
      : profile.role === "teacher"
        ? "Teacher profile"
        : "Parent profile";

  const selectedSchool =
    registrationOptions.schools.find((school) => school.code === schoolCode) ?? null;
  const selectedSchoolName =
    selectedSchool?.name ?? registrationOptions.public_institute.name;

  const availableCountries = useMemo(
    () => locationCatalog.map((option) => option.country),
    [locationCatalog],
  );
  const availableStates = useMemo(
    () => findCountryOption(locationCatalog, country)?.states ?? [],
    [country, locationCatalog],
  );
  const availableStateNames = useMemo(
    () => availableStates.map((option) => option.name),
    [availableStates],
  );
  const availableCities = useMemo(
    () => findStateOption(locationCatalog, country, stateValue)?.cities ?? [],
    [country, locationCatalog, stateValue],
  );
  const availableCityNames = useMemo(
    () => availableCities.map((option) => option.name),
    [availableCities],
  );
  const availablePincodes = useMemo(
    () => findCityOption(locationCatalog, country, stateValue, city)?.pincodes ?? [],
    [city, country, locationCatalog, stateValue],
  );
  const visibleCountries = useMemo(
    () => ensureValueInList(availableCountries, country),
    [availableCountries, country],
  );
  const visibleStates = useMemo(
    () => ensureValueInList(availableStateNames, stateValue),
    [availableStateNames, stateValue],
  );
  const visibleCities = useMemo(
    () => ensureValueInList(availableCityNames, city),
    [availableCityNames, city],
  );
  const visiblePincodes = useMemo(
    () => ensureValueInList(availablePincodes, pincode),
    [availablePincodes, pincode],
  );
  const visibleFieldErrors = useMemo(() => {
    const nextErrors = { ...state.fieldErrors };

    if (country) delete nextErrors.country;
    if (stateValue) delete nextErrors.state;
    if (city) delete nextErrors.city;
    if (pincode) delete nextErrors.pincode;

    return nextErrors;
  }, [city, country, pincode, state.fieldErrors, stateValue]);
  const shouldShowErrorBanner =
    Boolean(state.message) || Object.keys(visibleFieldErrors).length > 0;

  function toggleSubject(value: string) {
    setStudentSubjects((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function toggleTeacherScope(value: string) {
    setTeacherScope((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function handleCountryChange(nextCountry: string) {
    setCountry(nextCountry);

    const nextStates = findCountryOption(locationCatalog, nextCountry)?.states ?? [];
    const stateStillValid = nextStates.some((option) => option.name === stateValue);

    if (!stateStillValid) {
      setStateValue("");
      setCity("");
      setPincode("");
      return;
    }

    const nextCities = findStateOption(locationCatalog, nextCountry, stateValue)?.cities ?? [];
    const cityStillValid = nextCities.some((option) => option.name === city);

    if (!cityStillValid) {
      setCity("");
      setPincode("");
      return;
    }

    const nextPincodes = findCityOption(locationCatalog, nextCountry, stateValue, city)?.pincodes ?? [];
    if (!nextPincodes.includes(pincode)) {
      setPincode(nextPincodes[0] ?? "");
    }
  }

  function handleStateChange(nextState: string) {
    setStateValue(nextState);

    const nextCities = findStateOption(locationCatalog, country, nextState)?.cities ?? [];
    const cityStillValid = nextCities.some((option) => option.name === city);

    if (!cityStillValid) {
      setCity("");
      setPincode("");
      return;
    }

    const nextPincodes = findCityOption(locationCatalog, country, nextState, city)?.pincodes ?? [];
    if (!nextPincodes.includes(pincode)) {
      setPincode(nextPincodes[0] ?? "");
    }
  }

  function handleCityChange(nextCity: string) {
    setCity(nextCity);
    const nextPincodes = findCityOption(locationCatalog, country, stateValue, nextCity)?.pincodes ?? [];
    setPincode(nextPincodes[0] ?? "");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submission = new FormData(event.currentTarget);
    submission.set("country", country);
    submission.set("state", stateValue);
    submission.set("city", city);
    submission.set("pincode", pincode);
    submission.set("subject_interests", studentSubjects.join(","));
    submission.set("teaching_scope", teacherScope.join(","));

    startTransition(() => {
      formAction(submission);
    });
  }

  return (
    <form
      className="registrationWorkflow registrationWorkflowSingle"
      noValidate
      onSubmit={handleSubmit}
    >
      <input name="role" type="hidden" value={profile.role} />
      <input name="phone" type="hidden" value={phone} />
      <input name="subject_interests" type="hidden" value={studentSubjects.join(",")} />
      <input name="teaching_scope" type="hidden" value={teacherScope.join(",")} />

      <div className="registrationTopIntro">
        <div className="registrationTopIntroCopy">
          <span className="eyebrow">Complete profile</span>
          <h1>Finish your {roleTitle.toLowerCase()} and enter Nexora</h1>
          <p>
            The account is already created. This guided second step confirms the
            profile data needed for dashboard defaults, role-based content, and
            future analytics across school and location segments.
          </p>
        </div>

        <div className="registrationTopIntroMeta">
          <span>{getRoleCompletionBadge(profile.role)}</span>
          <span>{selectedSchoolName}</span>
          <span>Dashboard access unlocks next</span>
        </div>
      </div>

      <div className="registrationWorkflowHeader">
        <div>
          <span className="eyebrow">{getRoleCompletionBadge(profile.role)}</span>
          <h2>{roleTitle} completion</h2>
          <p>
            This is shown only once for new public users. After this, Nexora
            will send you straight into the correct workspace.
          </p>
          <div className="registrationWorkflowMeta">
            <span>{selectedSchoolName}</span>
            <span>{profile.role.replace("_", " ")}</span>
            <span>{profile.username}</span>
          </div>
        </div>
        <span className="statusPill">Required before dashboard access</span>
      </div>

      {shouldShowErrorBanner ? (
        <div className="registrationErrorBanner" aria-live="polite" tabIndex={-1}>
          <p className="registrationErrorBannerTitle">Please review the highlighted details before continuing.</p>
          {state.message ? <p>{state.message}</p> : null}
          {Object.entries(visibleFieldErrors)
            .filter(([, value]) => Boolean(value))
            .map(([field, message]) => (
              <p key={field}>
                <strong>{getReadableFieldLabel(field)}:</strong> {message}
              </p>
            ))}
        </div>
      ) : null}

      <div className="registrationWorkflowGrid registrationWorkflowGridQuick">
        <article className="registrationWorkflowPanel featurePlaceholder registrationQuickFormPanel">
          <div className="registrationFormStack">
            <div className="registrationSectionHeader">
              <strong>Academic and profile details</strong>
              <p>These fields shape your content lane, reports, and dashboard defaults.</p>
            </div>

            <label className="registrationField">
              <span>School / institute</span>
              <select
                name="school_code"
                onChange={(event) => setSchoolCode(event.target.value)}
                value={schoolCode}
              >
                <option value="">Use the default public institute</option>
                {registrationOptions.schools.map((school) => (
                  <option key={school.id} value={school.code}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>

            {profile.role === "student" ? (
              <>
                <div className="registrationFormRow">
                  <label className="registrationField">
                    <span>Class</span>
                    <select
                      aria-invalid={Boolean(state.fieldErrors.class_level)}
                      name="class_level"
                      onChange={(event) => {
                        const nextClassLevel = event.target.value;
                        const nextBand = clampClassBand(nextClassLevel);
                        const nextSuggestedSubjects =
                          registrationOptions.subject_catalog[nextBand] ??
                          registrationOptions.subject_catalog.middleSchool ??
                          [];
                        setStudentClassLevel(nextClassLevel);
                        setStudentSubjects((current) => {
                          const stillValid = current.filter((subject) =>
                            nextSuggestedSubjects.includes(subject),
                          );
                          return stillValid.length > 0 ? stillValid : nextSuggestedSubjects;
                        });
                      }}
                      value={studentClassLevel}
                    >
                      {registrationOptions.class_levels.map((classLevel) => (
                        <option key={classLevel} value={classLevel}>
                          Class {classLevel}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="registrationField">
                    <span>Board</span>
                    <select
                      aria-invalid={Boolean(state.fieldErrors.board)}
                      name="board"
                      onChange={(event) => setStudentBoard(event.target.value)}
                      value={studentBoard}
                    >
                      {registrationOptions.boards.map((boardValue) => (
                        <option key={boardValue} value={boardValue}>
                          {boardValue}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="registrationField">
                  <span>Main exam focus</span>
                  <select
                    aria-invalid={Boolean(state.fieldErrors.exam_interest)}
                    name="exam_interest"
                    onChange={(event) => setStudentFocus(event.target.value)}
                    value={studentFocus}
                  >
                    {suggestedStudentExams.map((focusValue) => (
                      <option key={focusValue} value={focusValue}>
                        {focusValue}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="registrationChoiceGroup">
                  <div className="registrationChoiceHeader">
                    <strong>Subject interests</strong>
                    <p>These are optional, but they help personalize the dashboard faster.</p>
                  </div>
                  <div className="registrationTagSelector">
                    {suggestedStudentSubjects.map((subject) => {
                      const active = studentSubjects.includes(subject);
                      return (
                        <button
                          className={`registrationTagOption ${active ? "registrationTagOptionActive" : ""}`}
                          key={subject}
                          onClick={() => toggleSubject(subject)}
                          type="button"
                        >
                          {subject}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}

            {profile.role === "teacher" ? (
              <>
                <label className="registrationField">
                  <span>Teaching focus</span>
                  <select
                    aria-invalid={Boolean(state.fieldErrors.teaching_focus)}
                    name="teaching_focus"
                    onChange={(event) => setTeacherFocus(event.target.value)}
                    value={teacherFocus}
                  >
                    {registrationOptions.teacher_focus_options.map((focusValue) => (
                      <option key={focusValue} value={focusValue}>
                        {focusValue}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="registrationChoiceGroup">
                  <div className="registrationChoiceHeader">
                    <strong>Teaching scope</strong>
                    <p>Select the subjects this teacher is likely to work with first.</p>
                  </div>
                  <div className="registrationTagSelector">
                    {teacherSubjectOptions.map((subject) => {
                      const active = teacherScope.includes(subject);
                      return (
                        <button
                          className={`registrationTagOption ${active ? "registrationTagOptionActive" : ""}`}
                          key={subject}
                          onClick={() => toggleTeacherScope(subject)}
                          type="button"
                        >
                          {subject}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}

            {profile.role === "parent" ? (
              <>
                <div className="registrationFormRow">
                  <label className="registrationField">
                    <span>Child class</span>
                    <select
                      aria-invalid={Boolean(state.fieldErrors.child_class_level)}
                      name="child_class_level"
                      onChange={(event) => setParentChildClass(event.target.value)}
                      value={parentChildClass}
                    >
                      {registrationOptions.class_levels.map((classLevel) => (
                        <option key={classLevel} value={classLevel}>
                          Class {classLevel}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="registrationField">
                    <span>Child board</span>
                    <select
                      aria-invalid={Boolean(state.fieldErrors.child_board)}
                      name="child_board"
                      onChange={(event) => setParentChildBoard(event.target.value)}
                      value={parentChildBoard}
                    >
                      {registrationOptions.boards.map((boardValue) => (
                        <option key={boardValue} value={boardValue}>
                          {boardValue}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="registrationField">
                  <span>Primary parent focus</span>
                  <select
                    name="parent_focus"
                    onChange={(event) => setParentFocus(event.target.value)}
                    value={parentFocus}
                  >
                    {registrationOptions.parent_focus_options.map((focusValue) => (
                      <option key={focusValue} value={focusValue}>
                        {focusValue}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            <div className="registrationSectionHeader">
              <strong>Location confirmation</strong>
              <p>Choose location in order. Each dropdown unlocks the next one so validation stays guided.</p>
            </div>

            <div className="registrationFormRow">
              <label className="registrationField">
                <span>Country</span>
                <select
                  aria-invalid={Boolean(visibleFieldErrors.country)}
                  name="country"
                  onChange={(event) => handleCountryChange(event.target.value)}
                  value={country}
                >
                  <option value="">Select country</option>
                  {visibleCountries.map((countryOption) => (
                    <option key={countryOption} value={countryOption}>
                      {countryOption}
                    </option>
                  ))}
                </select>
              </label>

              <label className="registrationField">
                <span>State</span>
                <select
                  aria-invalid={Boolean(visibleFieldErrors.state)}
                  disabled={!country}
                  name="state"
                  onChange={(event) => handleStateChange(event.target.value)}
                  value={stateValue}
                >
                  <option value="">{country ? "Select state" : "Select country first"}</option>
                  {visibleStates.map((stateOption) => (
                    <option key={stateOption} value={stateOption}>
                      {stateOption}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="registrationFormRow">
              <label className="registrationField">
                <span>City</span>
                <select
                  aria-invalid={Boolean(visibleFieldErrors.city)}
                  disabled={!stateValue}
                  name="city"
                  onChange={(event) => handleCityChange(event.target.value)}
                  value={city}
                >
                  <option value="">{stateValue ? "Select city" : "Select state first"}</option>
                  {visibleCities.map((cityOption) => (
                    <option key={cityOption} value={cityOption}>
                      {cityOption}
                    </option>
                  ))}
                </select>
              </label>

              <label className="registrationField">
                <span>Pincode</span>
                <select
                  aria-invalid={Boolean(visibleFieldErrors.pincode)}
                  disabled={!city}
                  name="pincode"
                  onChange={(event) => setPincode(event.target.value)}
                  value={pincode}
                >
                  <option value="">{city ? "Select pincode" : "Select city first"}</option>
                  {visiblePincodes.map((pincodeOption) => (
                    <option key={pincodeOption} value={pincodeOption}>
                      {pincodeOption}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="registrationField">
              <span>Timezone</span>
              <input
                name="timezone"
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="Asia/Kolkata"
                type="text"
                value={timezone}
              />
            </label>
          </div>
        </article>

        <aside className="registrationWorkflowPanel featurePlaceholder registrationQuickPreviewPanel">
          <div className="registrationPreviewRoleCard">
            <span className="eyebrow">Before you continue</span>
            <h3>Your account is already created</h3>
            <p>
              This final step connects the shared login to the correct role
              profile and confirms {getRoleCompletionSummary(profile.role).toLowerCase()}.
            </p>
          </div>

          <div className="registrationChecklistCard">
            <div>
              <strong>Login ID</strong>
              <p>{profile.email}</p>
            </div>
            <div>
              <strong>Phone</strong>
              <p>{phone || "Will be saved after confirmation"}</p>
            </div>
            <div>
              <strong>Destination</strong>
              <p>The matching dashboard opens right after this step.</p>
            </div>
          </div>

          <div className="registrationTagCloud">
            {country ? <span>{country}</span> : null}
            {stateValue ? <span>{stateValue}</span> : null}
            {city ? <span>{city}</span> : null}
            {selectedSchoolName ? <span>{selectedSchoolName}</span> : null}
          </div>

          <div className="registrationSummaryActions registrationSummaryActionsStack">
            <PendingButton
              className="button buttonPrimary"
              idleLabel="Complete profile"
              pendingLabel="Saving profile..."
            />
            <Link className="button buttonSecondary" href="/login">
              Back to login
            </Link>
          </div>
        </aside>
      </div>
    </form>
  );
}
