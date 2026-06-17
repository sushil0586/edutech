"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type CreateResult = {
  id?: string;
  detail?: string;
  username?: string;
  generated_password?: string | null;
  [key: string]: unknown;
};

type TeacherFieldErrors = Partial<Record<
  | "employee_code"
  | "first_name"
  | "email"
  | "phone"
  | "qualification"
  | "specialization"
  | "bio"
  | "joined_at",
  string
>>;

function firstError(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

export function TeacherCreateDialog({
  instituteId,
}: {
  instituteId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [qualification, setQualification] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [createLogin, setCreateLogin] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<TeacherFieldErrors>({});
  const portalTarget = typeof document === "undefined" ? null : document.body;

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
    setEmployeeCode("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setQualification("");
    setSpecialization("");
    setBio("");
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

  async function submitTeacher() {
    if (!instituteId) {
      setMessage("Select an institute before creating a teacher.");
      return;
    }
    const nextFieldErrors: TeacherFieldErrors = {};
    if (!employeeCode.trim()) nextFieldErrors.employee_code = "Employee code is required.";
    if (!firstName.trim()) nextFieldErrors.first_name = "First name is required.";
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setMessage("Fill the required fields to continue.");
      return;
    }

    setLoading(true);
    setMessage("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/admin/people/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute: instituteId,
          employee_code: employeeCode.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          qualification: qualification.trim(),
          specialization: specialization.trim(),
          bio: bio.trim(),
          joined_at: joinedAt || undefined,
          is_active: isActive,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as CreateResult;
      if (!response.ok) {
        const apiFieldErrors: TeacherFieldErrors = {
          employee_code: firstError(payload.employee_code),
          first_name: firstError(payload.first_name),
          email: firstError(payload.email),
          phone: firstError(payload.phone),
          qualification: firstError(payload.qualification),
          specialization: firstError(payload.specialization),
          bio: firstError(payload.bio),
          joined_at: firstError(payload.joined_at),
        };
        setFieldErrors(
          Object.fromEntries(
            Object.entries(apiFieldErrors).filter(([, value]) => Boolean(value)),
          ) as TeacherFieldErrors,
        );
        throw new Error(
          typeof payload.detail === "string"
            ? payload.detail
            : "Teacher could not be created. Review the highlighted fields.",
        );
      }

      if (createLogin && payload.id) {
        const loginResponse = await fetch(
          `/api/admin/account-management/teachers/${payload.id}/create-login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ auto_generate: true }),
          },
        );
        const loginPayload = (await loginResponse.json().catch(() => ({}))) as CreateResult;
        if (!loginResponse.ok) {
          throw new Error(loginPayload.detail ?? "Teacher saved, but login creation failed.");
        }
        setMessage(
          `Teacher created and login generated${loginPayload.username ? ` for ${loginPayload.username}` : ""}.`,
        );
      } else {
        setMessage("Teacher created successfully.");
      }

      resetForm();
      closeDialog();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Teacher creation failed.");
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
          Create teacher
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
                  <span className="eyebrow">Create teacher</span>
                  <h3>New teacher profile</h3>
                </div>
                <button className="appTopbarAction setupSecondaryAction" onClick={closeDialog} type="button">
                  Close
                </button>
              </div>
              <p className="academicSectionDescription">
                Add a teacher profile and optionally generate a login in one step.
              </p>

              <div className="setupFormGrid setupFormGridDense">
                <label className="setupField">
                  <span>Employee code</span>
                  <input
                    aria-invalid={Boolean(fieldErrors.employee_code)}
                    className={fieldErrors.employee_code ? "setupFieldInvalid" : undefined}
                    value={employeeCode}
                    onChange={(event) => setEmployeeCode(event.target.value)}
                  />
                  {fieldErrors.employee_code ? <small className="setupFieldError">{fieldErrors.employee_code}</small> : null}
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
                  <span>Qualification</span>
                  <input
                    aria-invalid={Boolean(fieldErrors.qualification)}
                    className={fieldErrors.qualification ? "setupFieldInvalid" : undefined}
                    value={qualification}
                    onChange={(event) => setQualification(event.target.value)}
                  />
                  {fieldErrors.qualification ? <small className="setupFieldError">{fieldErrors.qualification}</small> : null}
                </label>
                <label className="setupField">
                  <span>Specialization</span>
                  <input
                    aria-invalid={Boolean(fieldErrors.specialization)}
                    className={fieldErrors.specialization ? "setupFieldInvalid" : undefined}
                    value={specialization}
                    onChange={(event) => setSpecialization(event.target.value)}
                  />
                  {fieldErrors.specialization ? <small className="setupFieldError">{fieldErrors.specialization}</small> : null}
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
                  <span>Bio</span>
                  <textarea
                    aria-invalid={Boolean(fieldErrors.bio)}
                    className={fieldErrors.bio ? "setupFieldInvalid" : undefined}
                    rows={4}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                  />
                  {fieldErrors.bio ? <small className="setupFieldError">{fieldErrors.bio}</small> : null}
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
                <button className="appTopbarAction" disabled={loading} onClick={() => void submitTeacher()} type="button">
                  <span className="appTopbarActionIcon" aria-hidden="true">⌘</span>
                  {loading ? "Saving..." : "Create teacher"}
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
