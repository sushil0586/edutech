"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

type AcademicYearRecord = {
  id: string;
  name: string;
  is_active: boolean;
};

type ProgramRecord = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type CohortRecord = {
  id: string;
  program: string;
  academic_year: string;
  name: string;
  is_active: boolean;
};

type CreateResult = {
  id?: string;
  detail?: string;
  [key: string]: unknown;
};

type StudentFieldErrors = Partial<Record<
  | "admission_no"
  | "first_name"
  | "academic_year"
  | "program"
  | "cohort"
  | "email"
  | "phone"
  | "guardian_name"
  | "guardian_phone"
  | "address"
  | "joined_at",
  string
>>;

function firstError(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

export function StudentCreateDialog({
  instituteId,
  academicYears,
  programs,
  cohorts,
}: {
  instituteId: string | null;
  academicYears: AcademicYearRecord[];
  programs: ProgramRecord[];
  cohorts: CohortRecord[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("prefer_not_to_say");
  const [academicYear, setAcademicYear] = useState("");
  const [program, setProgram] = useState("");
  const [cohort, setCohort] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [address, setAddress] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [createLogin, setCreateLogin] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<StudentFieldErrors>({});
  const portalTarget = typeof document === "undefined" ? null : document.body;

  const filteredCohorts = useMemo(
    () =>
      cohorts.filter(
        (item) =>
          (!program || item.program === program) &&
          (!academicYear || item.academic_year === academicYear),
      ),
    [academicYear, cohorts, program],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDialog();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function resetForm() {
    setAdmissionNo("");
    setFirstName("");
    setLastName("");
    setGender("prefer_not_to_say");
    setAcademicYear("");
    setProgram("");
    setCohort("");
    setEmail("");
    setPhone("");
    setGuardianName("");
    setGuardianPhone("");
    setAddress("");
    setJoinedAt("");
    setIsActive(true);
    setCreateLogin(true);
    setMessage("");
    setFieldErrors({});
  }

  function closeDialog() {
    setOpen(false);
    setMessage("");
    setFieldErrors({});
  }

  async function submitStudent() {
    if (!instituteId) {
      setMessage("Select an institute before creating a student.");
      return;
    }
    const nextFieldErrors: StudentFieldErrors = {};
    if (!admissionNo.trim()) nextFieldErrors.admission_no = "Admission number is required.";
    if (!firstName.trim()) nextFieldErrors.first_name = "First name is required.";
    if (!academicYear) nextFieldErrors.academic_year = "Academic year is required.";
    if (!program) nextFieldErrors.program = "Program is required.";
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setMessage("Fill the required fields to continue.");
      return;
    }

    setLoading(true);
    setMessage("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/admin/people/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute: instituteId,
          admission_no: admissionNo.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          gender,
          academic_year: academicYear,
          program,
          cohort: cohort || null,
          email: email.trim(),
          phone: phone.trim(),
          guardian_name: guardianName.trim(),
          guardian_phone: guardianPhone.trim(),
          address: address.trim(),
          joined_at: joinedAt || undefined,
          is_active: isActive,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as CreateResult;
      if (!response.ok) {
        const apiFieldErrors: StudentFieldErrors = {
          admission_no: firstError(payload.admission_no),
          first_name: firstError(payload.first_name),
          academic_year: firstError(payload.academic_year),
          program: firstError(payload.program),
          cohort: firstError(payload.cohort),
          email: firstError(payload.email),
          phone: firstError(payload.phone),
          guardian_name: firstError(payload.guardian_name),
          guardian_phone: firstError(payload.guardian_phone),
          address: firstError(payload.address),
          joined_at: firstError(payload.joined_at),
        };
        setFieldErrors(
          Object.fromEntries(
            Object.entries(apiFieldErrors).filter(([, value]) => Boolean(value)),
          ) as StudentFieldErrors,
        );
        throw new Error(
          typeof payload.detail === "string"
            ? payload.detail
            : "Student could not be created. Review the highlighted fields.",
        );
      }

      if (createLogin && payload.id) {
        const loginResponse = await fetch(
          `/api/admin/account-management/students/${payload.id}/create-login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ auto_generate: true }),
          },
        );
        const loginPayload = (await loginResponse.json().catch(() => ({}))) as CreateResult & {
          generated_password?: string | null;
          username?: string;
        };
        if (!loginResponse.ok) {
          throw new Error(loginPayload.detail ?? "Student saved, but login creation failed.");
        }
        setMessage(
          `Student created and login generated${loginPayload.username ? ` for ${loginPayload.username}` : ""}.`,
        );
      } else {
        setMessage("Student created successfully.");
      }

      resetForm();
      closeDialog();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Student creation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="accountActionStack">
      <div className="accountActionRow">
        <button
          className="appTopbarAction"
          disabled={!instituteId}
          onClick={() => setOpen(true)}
          type="button"
        >
          <span className="appTopbarActionIcon" aria-hidden="true">
            +
          </span>
          Create student
        </button>
      </div>

      {message ? <div className="featurePlaceholder statePanel"><p>{message}</p></div> : null}

      {open && portalTarget ? createPortal((
        <div className="rosterImportOverlay" role="presentation" onClick={closeDialog}>
          <div
            aria-modal="true"
            className="rosterImportDialog dashboardPanel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="studentPageTight">
              <div className="academicSectionHeader">
                <div>
                  <span className="eyebrow">Create student</span>
                  <h3>New student profile</h3>
                </div>
                <button className="appTopbarAction setupSecondaryAction" onClick={closeDialog} type="button">
                  Close
                </button>
              </div>
              <p className="academicSectionDescription">
                Add a student profile and optionally generate a login in one step.
              </p>

              <div className="setupFormGrid setupFormGridDense">
                <label className="setupField">
                  <span>Admission no</span>
                  <input
                    aria-invalid={Boolean(fieldErrors.admission_no)}
                    className={fieldErrors.admission_no ? "setupFieldInvalid" : undefined}
                    value={admissionNo}
                    onChange={(event) => setAdmissionNo(event.target.value)}
                  />
                  {fieldErrors.admission_no ? <small className="setupFieldError">{fieldErrors.admission_no}</small> : null}
                </label>
                <label className="setupField">
                  <span>First name</span>
                  <input
                    aria-invalid={Boolean(fieldErrors.first_name)}
                    className={fieldErrors.first_name ? "setupFieldInvalid" : undefined}
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                  {fieldErrors.first_name ? <small className="setupFieldError">{fieldErrors.first_name}</small> : null}
                </label>
                <label className="setupField">
                  <span>Last name</span>
                  <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </label>
                <label className="setupField">
                  <span>Gender</span>
                  <select value={gender} onChange={(event) => setGender(event.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </label>
                <label className="setupField">
                  <span>Academic year</span>
                  <select
                    aria-invalid={Boolean(fieldErrors.academic_year)}
                    className={fieldErrors.academic_year ? "setupFieldInvalid" : undefined}
                    value={academicYear}
                    onChange={(event) => setAcademicYear(event.target.value)}
                  >
                    <option value="">Select academic year</option>
                    {academicYears.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.academic_year ? <small className="setupFieldError">{fieldErrors.academic_year}</small> : null}
                </label>
                <label className="setupField">
                  <span>Program</span>
                  <select
                    aria-invalid={Boolean(fieldErrors.program)}
                    className={fieldErrors.program ? "setupFieldInvalid" : undefined}
                    value={program}
                    onChange={(event) => {
                      setProgram(event.target.value);
                      setCohort("");
                    }}
                  >
                    <option value="">Select program</option>
                    {programs.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.code})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.program ? <small className="setupFieldError">{fieldErrors.program}</small> : null}
                </label>
                <label className="setupField">
                  <span>Cohort</span>
                  <select
                    aria-invalid={Boolean(fieldErrors.cohort)}
                    className={fieldErrors.cohort ? "setupFieldInvalid" : undefined}
                    value={cohort}
                    onChange={(event) => setCohort(event.target.value)}
                  >
                    <option value="">No cohort</option>
                    {filteredCohorts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.cohort ? <small className="setupFieldError">{fieldErrors.cohort}</small> : null}
                </label>
                <label className="setupField">
                  <span>Email</span>
                  <input
                    aria-invalid={Boolean(fieldErrors.email)}
                    className={fieldErrors.email ? "setupFieldInvalid" : undefined}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  {fieldErrors.email ? <small className="setupFieldError">{fieldErrors.email}</small> : null}
                </label>
                <label className="setupField">
                  <span>Phone</span>
                  <input
                    aria-invalid={Boolean(fieldErrors.phone)}
                    className={fieldErrors.phone ? "setupFieldInvalid" : undefined}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                  {fieldErrors.phone ? <small className="setupFieldError">{fieldErrors.phone}</small> : null}
                </label>
                <label className="setupField">
                  <span>Guardian name</span>
                  <input
                    aria-invalid={Boolean(fieldErrors.guardian_name)}
                    className={fieldErrors.guardian_name ? "setupFieldInvalid" : undefined}
                    value={guardianName}
                    onChange={(event) => setGuardianName(event.target.value)}
                  />
                  {fieldErrors.guardian_name ? <small className="setupFieldError">{fieldErrors.guardian_name}</small> : null}
                </label>
                <label className="setupField">
                  <span>Guardian phone</span>
                  <input
                    aria-invalid={Boolean(fieldErrors.guardian_phone)}
                    className={fieldErrors.guardian_phone ? "setupFieldInvalid" : undefined}
                    value={guardianPhone}
                    onChange={(event) => setGuardianPhone(event.target.value)}
                  />
                  {fieldErrors.guardian_phone ? <small className="setupFieldError">{fieldErrors.guardian_phone}</small> : null}
                </label>
                <label className="setupField">
                  <span>Joined at</span>
                  <input
                    aria-invalid={Boolean(fieldErrors.joined_at)}
                    className={fieldErrors.joined_at ? "setupFieldInvalid" : undefined}
                    type="date"
                    value={joinedAt}
                    onChange={(event) => setJoinedAt(event.target.value)}
                  />
                  {fieldErrors.joined_at ? <small className="setupFieldError">{fieldErrors.joined_at}</small> : null}
                </label>
                <label className="setupField">
                  <span>Address</span>
                  <textarea
                    aria-invalid={Boolean(fieldErrors.address)}
                    className={fieldErrors.address ? "setupFieldInvalid" : undefined}
                    rows={4}
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                  {fieldErrors.address ? <small className="setupFieldError">{fieldErrors.address}</small> : null}
                </label>
              </div>

              <div className="setupToggleGrid">
                <label className="setupToggle setupToggleWide">
                  <input checked={isActive} onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />
                  <span>Active</span>
                </label>
                <label className="setupToggle setupToggleWide">
                  <input checked={createLogin} onChange={(event) => setCreateLogin(event.target.checked)} type="checkbox" />
                  <span>Create login after save</span>
                </label>
              </div>

              <div className="setupFieldActions">
                <button className="appTopbarAction" disabled={loading} onClick={() => void submitStudent()} type="button">
                  <span className="appTopbarActionIcon" aria-hidden="true">⌘</span>
                  {loading ? "Saving..." : "Create student"}
                </button>
                <button className="appTopbarAction setupSecondaryAction" disabled={loading} onClick={closeDialog} type="button">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ), portalTarget) : null}
    </div>
  );
}
