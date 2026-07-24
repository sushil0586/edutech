# Jenkins CI/CD Setup

Date: Friday, July 24, 2026
Audience: DevOps, engineering, release owner
Purpose: Configure Jenkins for the current Nexora Learn repo

## What Was Added

- [Jenkinsfile](/Users/ansh/Documents/Eductech/Jenkinsfile)

The pipeline supports:

- CI-only quality gates
- CD-only deployment
- full CI + CD runs
- optional Playwright suites
- stage or production deployment targets

## Pipeline Design

The pipeline follows the project's current working model:

- backend: Django in `edutech_backend`
- web frontend: Next.js in `edutech_web`
- deployment target: systemd services from `deployment/`
- quality gates aligned to the existing GitHub Actions logic
- Playwright regression aligned to the current release suites

## Jenkins Agent Requirements

Use a Jenkins agent with:

- Linux
- Docker available to the Jenkins user
- Python 3 available as `python3`
- Node.js available either:
  - from a Jenkins NodeJS tool
  - or already installed on the Jenkins agent
- network access to the deployment target

Recommended label:

- `linux && docker`

If Node is already installed on the agent, set:

- `USE_SYSTEM_NODE=true`

## Jenkins Credentials Needed

Create these Jenkins credentials before using the pipeline:

- `PLAYWRIGHT_STUDENT_USERNAME`
- `PLAYWRIGHT_STUDENT_PASSWORD`
- `PLAYWRIGHT_TEACHER_USERNAME`
- `PLAYWRIGHT_TEACHER_PASSWORD`
- `PLAYWRIGHT_INSTITUTE_USERNAME`
- `PLAYWRIGHT_INSTITUTE_PASSWORD`
- `nexora-ssh`
  Use an SSH private key credential for the deploy user
- `NEXORA_STAGE_HOST`
  Secret text with the staging hostname or IP
- `NEXORA_PROD_HOST`
  Secret text with the production hostname or IP

## Minimal CI-Only First Setup

If you want to get Jenkins working first without deployment, create only these credentials:

- `PLAYWRIGHT_STUDENT_USERNAME`
  Value: `demo-student`
- `PLAYWRIGHT_STUDENT_PASSWORD`
  Value: `Demo@12345`
- `PLAYWRIGHT_TEACHER_USERNAME`
  Value: `demo-teacher`
- `PLAYWRIGHT_TEACHER_PASSWORD`
  Value: `Demo@12345`
- `PLAYWRIGHT_INSTITUTE_USERNAME`
  Value: `demo-institute-admin`
- `PLAYWRIGHT_INSTITUTE_PASSWORD`
  Value: `Demo@12345`

Then use:

- `PIPELINE_MODE=ci`
- `DEPLOY_ENV=none`
- `USE_SYSTEM_NODE=true` if Node and npm are already installed on the Jenkins agent

This lets you stand up:

- backend quality
- frontend quality
- Playwright smoke, baseline, or final-checkpoint suites

without needing:

- SSH deploy credentials
- staging host
- production host

## Pipeline Parameters

- `PIPELINE_MODE`
  - `ci`
  - `cd`
  - `full`

- `JENKINS_AGENT_LABEL`
  - default: `linux && docker`

- `NODE_TOOL_NAME`
  - default: `node-20`

- `USE_SYSTEM_NODE`
  - `true`
  - `false`

- `E2E_SUITE`
  - `none`
  - `smoke`
  - `baseline`
  - `final-checkpoint`

- `DEPLOY_ENV`
  - `none`
  - `staging`
  - `production`

- `RUN_BACKEND_TESTS`
- `RUN_FRONTEND_BUILD`

## Recommended Jobs

### 1. Pull Request CI

Use:

- `PIPELINE_MODE=ci`
- `E2E_SUITE=none`
- `RUN_BACKEND_TESTS=true`
- `RUN_FRONTEND_BUILD=true`

Purpose:

- Django checks
- migrations drift check
- Django tests
- Next.js typecheck and build

This job does not need Playwright credentials if `E2E_SUITE=none`.

### 2. Nightly Regression

Use:

- `PIPELINE_MODE=ci`
- `E2E_SUITE=baseline`
- `RUN_BACKEND_TESTS=true`
- `RUN_FRONTEND_BUILD=true`

Purpose:

- baseline Playwright regression
- artifact archiving for `playwright-report` and `test-results`

### 3. Release Gate

Use:

- `PIPELINE_MODE=ci`
- `E2E_SUITE=final-checkpoint`
- `RUN_BACKEND_TESTS=true`
- `RUN_FRONTEND_BUILD=true`

Purpose:

- high-value release bundle before approval

### 4. Staging Deploy

Use:

- `PIPELINE_MODE=full`
- `E2E_SUITE=smoke` or `baseline`
- `DEPLOY_ENV=staging`

### 5. Production Deploy

Use:

- `PIPELINE_MODE=full`
- `E2E_SUITE=final-checkpoint`
- `DEPLOY_ENV=production`

## Deploy Flow

The deploy stage:

1. syncs the repo to `${DEPLOY_PATH}`
2. creates or refreshes the backend virtualenv
3. installs backend dependencies plus `gunicorn`
4. runs Django migrations
5. builds the Next.js frontend
6. restarts:
   - `nexora-learn-backend`
   - `nexora-learn-web`
7. reloads `nginx`

## Important Assumptions

- The remote server path is `/var/www/nexora-learn/edutech`
- The remote deploy user is `ubuntu`
- The service names match:
  - `nexora-learn-backend`
  - `nexora-learn-web`
- The backend health path is `/api/v1/health/`

If your server differs, update the constants at the top of [Jenkinsfile](/Users/ansh/Documents/Eductech/Jenkinsfile).

## First Jenkins Run

Recommended order:

1. run `ci` with `E2E_SUITE=none`
2. run `ci` with `E2E_SUITE=smoke`
3. run `full` with `DEPLOY_ENV=staging`
4. verify services on stage
5. use `full` with `DEPLOY_ENV=production` only after staging is stable

## Notes

- This pipeline does not attempt broad native mobile app builds.
- It is intentionally centered on the currently signed-off web and browser release path.
- If you want Android/iPhone app builds in Jenkins next, add separate mobile lanes rather than mixing them into this web/backend deploy path.
- If Jenkins cannot resolve `node-20`, either change `NODE_TOOL_NAME` to your real Jenkins NodeJS tool name or use `USE_SYSTEM_NODE=true`.
