# Nexora Learn Pilot Runbook

## Pilot Goals

This runbook is for the first real-user rollout of Nexora Learn.

Core pilot scope:

- academic setup
- question bank
- exams
- student attempts
- results
- analytics
- notifications
- teacher/student login workflows

## Admin Login Creation Workflow

Use the admin UI inside:

- `Academic Setup -> Students`
- `Academic Setup -> Teachers`

Per profile, the admin can:

- create a login
- reset password
- disable login
- enable login

List status meanings:

- `No Login`
- `Active`
- `Disabled`

## How To Create Teacher/Student Logins

1. Open the relevant student or teacher row in Academic Setup.
2. Click `Create Login`.
3. Choose either:
   - manual username/password
   - auto-generated credentials
4. Copy the returned credentials immediately.
5. Share them securely.

Important:

- the password is shown only once
- academic profiles remain separate from login identities
- one academic profile can only have one linked login

## How To Reset Passwords

1. Open the relevant student or teacher row.
2. Click `Reset Password`.
3. Choose a manual password or auto-generate a temporary one.
4. Copy the result immediately.
5. Share it securely with the user.

## How To Share Credentials Securely

- prefer direct 1:1 delivery
- avoid sending passwords in public channels
- avoid leaving generated passwords in long-lived shared spreadsheets
- ask recipients to confirm receipt before closing the dialog if operationally needed

## Pilot Checklist

- backend health endpoint returns `status=ok`
- backend production checks pass
- frontend web release build succeeds
- one institute admin can sign in
- one teacher can sign in
- one student can sign in
- teacher can see assigned academic setup/question/exam data only inside their institute
- student can only access their own attempts and results
- notifications load correctly
- result generation and publish flow works for a sample exam

## Rollback / Safety Notes

- disabling a login is the fastest non-destructive containment step
- do not deactivate academic profiles unless the academic record itself should be archived
- if a password is exposed, use `Reset Password` immediately
- if a pilot user should lose access temporarily, use `Disable Login`
