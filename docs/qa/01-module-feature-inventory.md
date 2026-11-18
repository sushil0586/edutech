# Module Feature Inventory

Status legend:

- Complete: source and current passing execution evidence exist.
- Partial: source exists but end-to-end behavior is not fully proven.
- Broken: confirmed failure or blocking mismatch exists.
- Placeholder/Mock: static, fallback, demo, or placeholder-oriented surface exists.
- Not Implemented: expected module surface is absent.
- Not Verified: source may exist, but no current execution evidence was found in this audit.

No module is marked Complete because this discovery did not execute the full product test suite and the only current Playwright result artifact found is failed.

## Role And Route Inventory

| Role | Web routes | Main evidence | State |
| --- | --- | --- | --- |
| Public/Marketing | `/`, `/[slug]` | `edutech_web/src/app/(marketing)`; `edutech_web/src/lib/site-content.ts` | Placeholder/Mock |
| Auth | `/login`, `/register`, `/signup`, `/complete-profile` | `edutech_web/src/app/(auth)`, `edutech_web/src/lib/auth` | Partial / Not Verified |
| Platform Admin | `/admin`, `/admin/dashboard`, `/admin/institutes`, `/admin/people`, `/admin/academic-setup`, `/admin/economy`, `/admin/exams`, `/admin/reports`, `/admin/search`, `/admin/security`, `/admin/settings` | `edutech_web/src/app/(admin)/admin` | Partial / Not Verified |
| Institute Admin | `/institute/dashboard`, `/institute/people`, `/institute/academic-setup`, `/institute/economy`, `/institute/exams`, `/institute/question-bank`, `/institute/results`, `/institute/reviews`, `/institute/reports`, `/institute/search`, `/institute/security`, `/institute/settings`, `/institute/teacher-assignments` | `edutech_web/src/app/(institute)/institute` | Partial / Not Verified |
| Teacher | `/teacher/dashboard`, `/teacher/exams`, `/teacher/question-bank`, `/teacher/results`, `/teacher/reviews`, `/teacher/reports`, `/teacher/search` | `edutech_web/src/app/(teacher)/teacher` | Partial / Not Verified |
| Student Web | `/app/dashboard`, `/app/exams`, `/app/attempts`, `/app/results`, `/app/practice`, `/app/analytics`, `/app/reports`, `/app/weak-areas`, `/app/notifications`, `/app/wallet`, `/app/subscriptions`, `/app/profile`, `/app/settings`, `/app/search` | `edutech_web/src/app/(student)/app` | Partial / Not Verified |
| Parent | `/parent/dashboard`, `/parent/children`, `/parent/progress`, `/parent/alerts`, `/parent/settings`, `/parent/search` | `edutech_web/src/app/(parent)/parent`, `edutech_backend/apps/parents` | Partial / Not Verified |
| Student Mobile | login/register/role gate; dashboard/exams/results/attempts/analytics/profile tabs | `nexora_student_mobile/app`, `nexora_student_mobile/src/lib/api` | Partial / Not Verified |

## Backend Module Inventory

| Module | Model evidence | API evidence in top-level backend | Web/API consumer evidence | State |
| --- | --- | --- | --- | --- |
| Accounts/Auth | `edutech_backend/apps/accounts/models.py` | `management_urls.py` exists; top-level `urls.py` absent | `edutech_web/src/lib/auth` | Partial |
| Institutes | `apps/institutes/models.py` | No `apps/institutes/urls.py`, views, or serializers found | `/api/admin/institutes/*`, `/api/institute/institutes/*` proxy routes | Broken / Partial |
| Geography | `apps/geography/models.py` | No URL/view/serializer found | public location detect route exists in web | Partial |
| Academics | `apps/academics/models.py` | No `apps/academics/urls.py`, views, or serializers found | admin/teacher academic proxy routes | Broken / Partial |
| Students | `apps/students/models.py` | No `apps/students/urls.py`, views, or serializers found | student web/mobile API clients | Broken / Partial |
| Teachers | `apps/teachers/models.py` | No `apps/teachers/urls.py`, views, or serializers found | teacher/admin workspace routes | Broken / Partial |
| Parents | `apps/parents/models.py` | No `apps/parents/urls.py`, views, or serializers found | parent proxy routes and components | Broken / Partial |
| Question Bank | `apps/question_bank/models.py` | No `apps/question_bank/urls.py`, views, or serializers found | question-bank proxy routes/components | Broken / Partial |
| Exams | `apps/exams/models.py` | No `apps/exams/urls.py`, views, or serializers found | exam builder/detail routes; failed lifecycle evidence | Broken |
| Attempts | `apps/attempts/models.py` | No `apps/attempts/urls.py`, views, or serializers found | student attempt routes/proxy actions | Broken / Partial |
| Results | `apps/results/models.py` | No `apps/results/urls.py`, views, or serializers found | results/report routes | Broken / Partial |
| Economy | `apps/economy/models.py` | No `apps/economy/urls.py`, views, or serializers found | admin/student economy proxy routes | Broken / Partial |
| Reports/Notifications | `apps/reports/models.py`; `admin_urls.py` exists | `admin_urls.py` only confirmed URL module | reports and notifications routes | Partial |

## Feature Classification Matrix

| Feature | Evidence | Classification | Priority |
| --- | --- | --- | --- |
| Login/session/JWT | `REST_FRAMEWORK` JWT settings; `edutech_web/src/lib/auth/session.ts`; mobile auth client | Partial / Not Verified | P0 |
| Public registration/profile completion | auth routes and tests listed | Partial / Not Verified | P1 |
| Role-based redirects and protected layouts | `edutech_web/src/lib/auth/session.ts`; role page groups | Partial / Not Verified | P0 |
| Institute onboarding | admin institute components and many specs | Partial / Not Verified | P0 |
| Roster import | admin roster proxy routes/components | Partial / Not Verified | P1 |
| Teacher assignment | admin/institute teacher assignment routes/components | Partial / Not Verified | P1 |
| Academic setup | academics models and admin/institute pages | Partial; backend API surface missing in top-level source | P1 |
| Question CRUD | question bank models and routes | Partial; backend API surface missing in top-level source | P0 |
| Question CSV import | import components and proxy routes | Partial / Not Verified | P1 |
| Comprehension passage authoring/import | routes/components exist | Partial / Not Verified | P1 |
| Shared/master question library | models/routes/components exist | Partial / Not Verified | P1 |
| Exam quick create | routes/components exist | Partial / Not Verified | P0 |
| Advanced exam builder | routes/components/specs exist | Partial / Not Verified | P0 |
| Exam publishing/assignment/visibility | models/routes exist; latest full-access lifecycle failed | Broken | P0 |
| Student exam list/detail | pages exist; failure shows unavailable detail state | Partial / Broken in one flow | P0 |
| Student attempt runtime | models/pages/mobile screen exist | Partial / Not Verified | P0 |
| Auto-submit/integrity events/artifacts | components/proxy routes exist | Partial / Not Verified | P1 |
| Manual review/moderation | attempt review models and review pages exist | Partial / Not Verified | P1 |
| Results and analytics | models/pages/specs exist | Partial / Not Verified | P0 |
| Reports by weak areas, time, subject, rank, wrong questions | pages/components exist | Partial / Not Verified | P1 |
| Notifications | reports notification model, web/mobile routes | Partial / Not Verified | P1 |
| Parent alerts/preferences/progress | parent models/components/routes | Partial / Not Verified | P1 |
| Economy wallet/subscriptions/star packs/referrals | economy models and routes | Partial / Not Verified | P1 |
| Search | web search pages for roles | Partial / Not Verified | P2 |
| Security/admin settings pages | pages exist | Partial / Not Verified | P1 |
| Marketing pages | static content | Placeholder/Mock | P2 |
| Mobile student app | screens/API clients exist | Partial / Not Verified | P1 |

## Confirmed Broken Evidence

- `edutech_web/test-results/.last-run.json` status is failed.
- `error-context.md` shows the student saw "This exam is not available in your workspace" after the full-access lifecycle created and assigned an exam.
- Top-level backend `config/urls.py` includes app URLs that were not found as files in `edutech_backend/apps`.

## Not Verified Evidence

The repository contains many specs and scripts, but source presence is not coverage evidence. Current pass/fail artifacts are required before marking any module Complete.
