# GitHub Actions CI-First Setup

Date: Friday, July 24, 2026
Audience: Product owner, engineering, repo admin
Purpose: Get CI running now using GitHub before introducing Jenkins

## Recommendation

Use GitHub Actions first.

Reason:

- the repo already contains working workflows
- no Jenkins server is required
- no Jenkins agent setup is required
- no SSH deployment setup is required just to start quality gates

## Existing GitHub Workflows

Already present in this repo:

- `.github/workflows/wave-1-quality-gates.yml`
- `.github/workflows/edutech-web-playwright-smoke.yml`
- `.github/workflows/edutech-web-playwright-regression.yml`
- `.github/workflows/family-release-validation.yml`

## Minimum Secrets To Add First

Go to:

- GitHub repo
- `Settings`
- `Secrets and variables`
- `Actions`
- `New repository secret`

Create these secrets:

- `PLAYWRIGHT_BASE_URL`
  - value: the URL where your running web app is reachable
  - example: `https://your-stage-domain.com`

- `PLAYWRIGHT_STUDENT_USERNAME`
  - value: `demo-student`

- `PLAYWRIGHT_STUDENT_PASSWORD`
  - value: `Demo@12345`

- `PLAYWRIGHT_TEACHER_USERNAME`
  - value: `demo-teacher`

- `PLAYWRIGHT_TEACHER_PASSWORD`
  - value: `Demo@12345`

- `PLAYWRIGHT_INSTITUTE_USERNAME`
  - value: `demo-institute-admin`

- `PLAYWRIGHT_INSTITUTE_PASSWORD`
  - value: `Demo@12345`

## Optional Secrets Later

Add these only when you want the larger family validation workflow:

- `PLAYWRIGHT_ADMIN_USERNAME`
  - value: `demo-platform-admin`

- `PLAYWRIGHT_ADMIN_PASSWORD`
  - value: `Demo@12345`

- `API_BASE_URL`
  - value: backend API base URL if the family validation bundle needs it
  - example: `https://your-stage-domain.com/api/v1`

## Best First Workflow To Run

Start with:

- `.github/workflows/wave-1-quality-gates.yml`

Why:

- it checks backend quality
- it checks frontend quality
- it does not need Playwright secrets when used as a pure quality gate

## Best Second Workflow To Run

Then run:

- `.github/workflows/edutech-web-playwright-smoke.yml`

Why:

- smaller than the baseline regression
- validates that the demo accounts and `PLAYWRIGHT_BASE_URL` are wired correctly
- easiest first browser proof from GitHub

## Best Third Workflow To Run

After smoke succeeds, run:

- `.github/workflows/edutech-web-playwright-regression.yml`
  - choose `baseline`

Why:

- broader browser regression
- still smaller and easier than the larger family validation workflow

## Exact Order

1. Add the minimum secrets.
2. Run `Wave 1 Quality Gates`.
3. Run `Edutech Web Playwright Smoke`.
4. Run `Edutech Web Playwright Regression` with `baseline`.
5. Add admin and API secrets later only if you want `Family Release Validation`.

## How To Trigger Manually

In GitHub:

1. Open the repo
2. Click `Actions`
3. Open the workflow you want
4. Click `Run workflow`
5. Choose the branch
6. Click `Run workflow`

For regression:

- choose `baseline` first
- use `smoke` only if you want a smaller rerun

## Important Notes

- `PLAYWRIGHT_BASE_URL` must point to a live environment that GitHub runners can access publicly.
- If your app only runs on your local laptop like `http://localhost:3000`, GitHub Actions cannot reach it.
- In that case, use:
  - a staging server
  - a public preview deployment
  - or run tests locally instead of in GitHub Actions

## Practical Next Step

If you want the fastest progress:

1. add the 7 minimum secrets
2. run `Wave 1 Quality Gates`
3. run `Edutech Web Playwright Smoke`

That is the cleanest CI-first path for Friday, July 24, 2026.
