# Stage Seed Contract Remediation 2026-07-06

## Purpose

Use this runbook to clear the two remaining admin stage contract failures that still keep stage release confidence below the browser-hardening baseline:

- missing AWS demo exam seed on stage
- missing public Class 8 Math academic and master-library seed on stage

This runbook assumes:

- frontend stage URL: `https://learn.accerio.in`
- backend is served from the same origin on stage
- platform admin account: `demo-platform-admin`

## Confirmed Current State

As of the start of `2026-07-06`, stage browser/admin hardening was in good shape, but two seed-contract checks still failed:

- `tests/e2e/workflow/admin-aws-results-contract.spec.ts`
  - stage API search for `DMO-AWS-PRACTICE-01` and `DMO-AWS-RESULT-01` returns no exam rows
- `tests/e2e/workflow/admin-class8-math-master-dataset.mutable.spec.ts`
- public institute `NEXORA-PUBLIC` exists
  - stage public academic registry currently returns no `Class 8` program rows
  - therefore there is no `CLS8-MATH` subject and no Class 8 Math master-library dataset yet

## Execution Result

Stage remediation was executed on `2026-07-06`.

Completed backend actions on stage:

- seeded AWS demo suite with `python manage.py seed_demo_aws_suite`
- repaired missing public-hub metadata with:
  - `python manage.py seed_public_institute_bootstrap --code NEXORA-PUBLIC --name "Nexora Public Learning"`
- seeded public Class 8 academics with:
  - `python manage.py seed_public_academics --institute-code NEXORA-PUBLIC --preset class_8_cbse_core`
- seeded public Class 8 Math master-library data with:
  - `python manage.py seed_master_question_library NEXORA-PUBLIC --preset class_8_cbse_core --subjects math --questions-per-topic 50`

Verified stage state after remediation:

- public hub list:
  - `NEXORA-PUBLIC`
- AWS exam codes present:
  - `DMO-AWS-PRACTICE-01`
  - `DMO-AWS-RESULT-01`
- public academic structure present:
  - program `CLS8`
  - subject `CLS8-MATH`
  - four expected Class 8 Math topic groups
- public Class 8 Math master-library count:
  - `200`

Verified Playwright revalidation on stage:

```bash
PLAYWRIGHT_BASE_URL=https://learn.accerio.in npx playwright test \
  tests/e2e/workflow/admin-aws-results-contract.spec.ts \
  tests/e2e/workflow/admin-class8-math-master-dataset.mutable.spec.ts \
  --project=chromium
```

Result:

- `2 passed`

## Important Correction

The old assumption that Class 8 public academics are blocked by missing preset code is no longer true.

The current backend already includes:

- public academic preset: `class_8_cbse_core`
- `seed_public_academics --preset class_8_cbse_core`
- `seed_master_question_library --preset class_8_cbse_core`

So the remaining blocker is stage seed execution, not missing backend preset support.

## Verified Backend Seed Commands

### AWS demo suite

Backend command:

```bash
python manage.py seed_demo_aws_suite
```

This command creates the two expected exam codes:

- `DMO-AWS-PRACTICE-01`
- `DMO-AWS-RESULT-01`

### Public institute bootstrap

If the public institute metadata ever needs repair:

```bash
python manage.py seed_public_institute_bootstrap --code NEXORA-PUBLIC
```

This command marks the institute as the public content hub and refreshes public-hub metadata.

### Public Class 8 academics

Seed the public academic structure:

```bash
python manage.py seed_public_academics \
  --institute-code NEXORA-PUBLIC \
  --preset class_8_cbse_core
```

Expected seeded academic structure:

- program: `CLS8`
- subject: `CLS8-MATH`
- topic groups:
  - `Rational Numbers`
  - `Linear Equations in One Variable`
  - `Comparing Quantities`
  - `Algebraic Expressions and Identities`

### Public Class 8 Math master questions

Seed the public Class 8 Math master-library rows:

```bash
python manage.py seed_master_question_library \
  NEXORA-PUBLIC \
  --preset class_8_cbse_core \
  --subjects math \
  --questions-per-topic 50
```

This should create:

- `4` leaf topics
- `50` questions per leaf topic
- `200` total Class 8 Math master questions

The current command already contains explicit Class 8 Math question-text handling for:

- program `CLS8`
- subject `CLS8-MATH`

## Recommended Stage Execution Order

Run on stage backend:

```bash
cd /var/www/nexora-learn/edutech/edutech_backend
source .venv/bin/activate
python manage.py seed_demo_aws_suite
python manage.py seed_public_academics --institute-code NEXORA-PUBLIC --preset class_8_cbse_core
python manage.py seed_master_question_library NEXORA-PUBLIC --preset class_8_cbse_core --subjects math --questions-per-topic 50
```

If the public-hub metadata is damaged or missing, run this first:

```bash
python manage.py seed_public_institute_bootstrap --code NEXORA-PUBLIC
```

## Immediate Verification Commands

### Verify AWS exam presence

```bash
python manage.py shell -c "from apps.exams.models import Exam; print(list(Exam.objects.filter(code__in=['DMO-AWS-PRACTICE-01','DMO-AWS-RESULT-01']).values_list('code', flat=True)))"
```

Expected output:

- both exam codes present

### Verify Class 8 academic structure

```bash
python manage.py shell -c "from apps.institutes.models import Institute; from apps.academics.models import Program, Subject, Topic; i=Institute.objects.get(code='NEXORA-PUBLIC'); p=list(Program.objects.filter(institute=i, code='CLS8').values_list('code','name')); s=list(Subject.objects.filter(institute=i, code='CLS8-MATH').values_list('code','name')); t=list(Topic.objects.filter(institute=i, subject__code='CLS8-MATH', parent_topic__isnull=True).values_list('name', flat=True)); print('programs=',p); print('subjects=',s); print('topics=',t)"
```

Expected output includes:

- `CLS8`
- `CLS8-MATH`
- the four expected topic groups

### Verify Class 8 master-library count

```bash
python manage.py shell -c "from apps.question_bank.models import MasterQuestion; print(MasterQuestion.objects.filter(source_institute__code='NEXORA-PUBLIC', source_subject__code='CLS8-MATH').count())"
```

Expected output:

- `200`

## Playwright Revalidation

After the stage seed completes, rerun:

```bash
cd /var/www/nexora-learn/edutech/edutech_web
PLAYWRIGHT_BASE_URL=https://learn.accerio.in npx playwright test \
  tests/e2e/workflow/admin-aws-results-contract.spec.ts \
  tests/e2e/workflow/admin-class8-math-master-dataset.mutable.spec.ts \
  --project=chromium
```

Observed result:

- `2 passed`

## Why This Matters

Once these seeds are present on stage:

- admin AWS oversight contract becomes real instead of fixture-empty
- public Class 8 Math onboarding/access automation becomes actionable again
- remaining admin confidence moves from browser-hardened-only to browser-plus-seed-backed

## Related Files

- [admin-aws-results-contract.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-aws-results-contract.spec.ts)
- [admin-class8-math-master-dataset.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-class8-math-master-dataset.mutable.spec.ts)
- [seed_demo_aws_suite.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/management/commands/seed_demo_aws_suite.py)
- [seed_public_academics.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/academics/management/commands/seed_public_academics.py)
- [seed_master_question_library.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/question_bank/management/commands/seed_master_question_library.py)
