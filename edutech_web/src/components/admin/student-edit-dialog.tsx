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

type StudentRosterRow = {
  id: string;
  institute: string;
  admission_no: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  academic_year?: string | null;
  program?: string | null;
  cohort?: string | null;
  full_name: string;
  email: string;
  phone: string;
  guardian_name?: string;
  guardian_phone?: string;
  address?: string;
  joined_at?: string | null;
  is_active: boolean;
};

type StudentFieldErrors = Partial<
  Record<
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
  >
>;

function firstError(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

export function StudentEditDialog({
  row,
  academicYears,
  programs,
  cohorts,
}: {
  row: StudentRosterRow;
  academicYears: AcademicYearRecord[];
  programs: ProgramRecord[];
  cohorts: CohortRecord[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [admissionNo, setAdmissionNo] = useState(row.admission_no);
  const [firstName, setFirstName] = useState(row.first_name ?? row.full_name.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(
    row.last_name ?? row.full_name.split(" ").slice(1).join(" "),
  );
  const [gender, setGender] = useState(row.gender ?? "prefer_not_to_say");
  const [academicYear, setAcademicYear] = useState(row.academic_year ?? "");
  const [program, setProgram] = useState(row.program ?? "");
  const [cohort, setCohort] = useState(row.cohort ?? "");
  const [email, setEmail] = useState(row.email);
  const [phone, setPhone] = useState(row.phone);
  const [guardianName, setGuardianName] = useState(row.guardian_name ?? "");
  const [guardianPhone, setGuardianPhone] = useState(row.guardian_phone ?? "");
  const [address, setAddress] = useState(row.address ?? "");
  const [joinedAt, setJoinedAt] = useState(row.joined_at ? row.joined_at.slice(0, 10) : "");
  const [isActive, setIsActive] = useState(row.is_active);
  const [fieldErrors, setFieldErrors] = useState<StudentFieldErrors>({});

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
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function submitStudentUpdate() {
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
      const response = await fetch(`/api/admin/people/students/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institute: row.institute,
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
          joined_at: joinedAt || null,
          is_active: isActive,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
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
            : "Student could not be updated. Review the highlighted fields.",
        );
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Student update failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="appTopbarAction setupSecondaryAction" onClick={() => setOpen(true)} type="button">
        <span className="appTopbarActionIcon" aria-hidden="true">
          ✎
        </span>
        Edit
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="rosterImportOverlay" onClick={() => setOpen(false)} role="presentation">
              <div
                aria-modal="true"
                className="rosterImportDialog dashboardPanel"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <div className="studentPageTight">
                  <div className="academicSectionHeader">
                    <div>
                      <span className="eyebrow">Edit student</span>
                      <h3>{row.full_name}</h3>
                    </div>
                    <button
                      className="appTopbarAction setupSecondaryAction"
                      onClick={() => setOpen(false)}
                      type="button"
                    >
                      Close
                    </button>
                  </div>
                  <p className="academicSectionDescription">
                    Update student identity, academic mapping, and contact details.
                  </p>

                  {message ? <div className="featurePlaceholder statePanel"><p>{message}</p></div> : null}

                  <div className="setupFormGrid setupFormGridDense">
                    <label className="setupField">
                      <span>Admission no</span>
                      <input
                        aria-invalid={Boolean(fieldErrors.admission_no)}
                        className={fieldErrors.admission_no ? "setupFieldInvalid" : undefined}
                        onChange={(event) => setAdmissionNo(event.target.value)}
                        value={admissionNo}
                      />
                    </label>
                    <label className="setupField">
                      <span>First name</span>
                      <input
                        aria-invalid={Boolean(fieldErrors.first_name)}
                        className={fieldErrors.first_name ? "setupFieldInvalid" : undefined}
                        onChange={(event) => setFirstName(event.target.value)}
                        value={firstName}
                      />
                    </label>
                    <label className="setupField">
                      <span>Last name</span>
                      <input onChange={(event) => setLastName(event.target.value)} value={lastName} />
                    </label>
                    <label className="setupField">
                      <span>Gender</span>
                      <select onChange={(event) => setGender(event.target.value)} value={gender}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </label>
                    <label className="setupField">
                      <span>Academic year</span>
                      <select onChange={(event) => setAcademicYear(event.target.value)} value={academicYear}>
                        <option value="">Select academic year</option>
                        {academicYears.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="setupField">
                      <span>Program</span>
                      <select
                        onChange={(event) => {
                          setProgram(event.target.value);
                          setCohort("");
                        }}
                        value={program}
                      >
                        <option value="">Select program</option>
                        {programs.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.code})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="setupField">
                      <span>Cohort</span>
                      <select onChange={(event) => setCohort(event.target.value)} value={cohort}>
                        <option value="">No cohort</option>
                        {filteredCohorts.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="setupField">
                      <span>Email</span>
                      <input onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
                    </label>
                    <label className="setupField">
                      <span>Phone</span>
                      <input onChange={(event) => setPhone(event.target.value)} value={phone} />
                    </label>
                    <label className="setupField">
                      <span>Guardian name</span>
                      <input onChange={(event) => setGuardianName(event.target.value)} value={guardianName} />
                    </label>
                    <label className="setupField">
                      <span>Guardian phone</span>
                      <input onChange={(event) => setGuardianPhone(event.target.value)} value={guardianPhone} />
                    </label>
                    <label className="setupField">
                      <span>Joined at</span>
                      <input onChange={(event) => setJoinedAt(event.target.value)} type="date" value={joinedAt} />
                    </label>
                    <label className="setupField">
                      <span>Address</span>
                      <textarea onChange={(event) => setAddress(event.target.value)} rows={4} value={address} />
                    </label>
                  </div>

                  <div className="setupToggleGrid">
                    <label className="setupToggle setupToggleWide">
                      <input checked={isActive} onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="setupFieldActions">
                    <button className="appTopbarAction" disabled={loading} onClick={() => void submitStudentUpdate()} type="button">
                      <span className="appTopbarActionIcon" aria-hidden="true">⌘</span>
                      {loading ? "Saving..." : "Save changes"}
                    </button>
                    <button className="appTopbarAction setupSecondaryAction" disabled={loading} onClick={() => setOpen(false)} type="button">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
