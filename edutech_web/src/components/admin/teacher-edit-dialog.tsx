"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type TeacherRosterRow = {
  id: string;
  institute: string;
  employee_code: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  email: string;
  phone: string;
  qualification?: string;
  specialization: string;
  bio?: string;
  joined_at?: string | null;
  is_active: boolean;
};

function firstError(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

export function TeacherEditDialog({ row }: { row: TeacherRosterRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [employeeCode, setEmployeeCode] = useState(row.employee_code);
  const [firstName, setFirstName] = useState(row.first_name ?? row.full_name.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(row.last_name ?? row.full_name.split(" ").slice(1).join(" "));
  const [email, setEmail] = useState(row.email);
  const [phone, setPhone] = useState(row.phone);
  const [qualification, setQualification] = useState(row.qualification ?? "");
  const [specialization, setSpecialization] = useState(row.specialization ?? "");
  const [bio, setBio] = useState(row.bio ?? "");
  const [joinedAt, setJoinedAt] = useState(row.joined_at ? row.joined_at.slice(0, 10) : "");
  const [isActive, setIsActive] = useState(row.is_active);

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

  async function submitTeacherUpdate() {
    if (!employeeCode.trim() || !firstName.trim()) {
      setMessage("Fill the required fields to continue.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/v1/teachers/${row.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institute: row.institute,
          employee_code: employeeCode.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          qualification: qualification.trim(),
          specialization: specialization.trim(),
          bio: bio.trim(),
          joined_at: joinedAt || null,
          is_active: isActive,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof payload.detail === "string" ? payload.detail : firstError(payload.employee_code) || firstError(payload.first_name) || "Teacher could not be updated. Review the highlighted fields.",
        );
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Teacher update failed.");
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
                      <span className="eyebrow">Edit teacher</span>
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
                    Update teacher identity, specialization, and contact details.
                  </p>

                  {message ? <div className="featurePlaceholder statePanel"><p>{message}</p></div> : null}

                  <div className="setupFormGrid setupFormGridDense">
                    <label className="setupField">
                      <span>Employee code</span>
                      <input onChange={(event) => setEmployeeCode(event.target.value)} value={employeeCode} />
                    </label>
                    <label className="setupField">
                      <span>First name</span>
                      <input onChange={(event) => setFirstName(event.target.value)} value={firstName} />
                    </label>
                    <label className="setupField">
                      <span>Last name</span>
                      <input onChange={(event) => setLastName(event.target.value)} value={lastName} />
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
                      <span>Qualification</span>
                      <input onChange={(event) => setQualification(event.target.value)} value={qualification} />
                    </label>
                    <label className="setupField">
                      <span>Specialization</span>
                      <input onChange={(event) => setSpecialization(event.target.value)} value={specialization} />
                    </label>
                    <label className="setupField">
                      <span>Joined at</span>
                      <input onChange={(event) => setJoinedAt(event.target.value)} type="date" value={joinedAt} />
                    </label>
                    <label className="setupField">
                      <span>Bio</span>
                      <textarea onChange={(event) => setBio(event.target.value)} rows={4} value={bio} />
                    </label>
                  </div>

                  <div className="setupToggleGrid">
                    <label className="setupToggle setupToggleWide">
                      <input checked={isActive} onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="setupFieldActions">
                    <button className="appTopbarAction" disabled={loading} onClick={() => void submitTeacherUpdate()} type="button">
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
