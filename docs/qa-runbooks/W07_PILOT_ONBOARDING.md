# W07 pilot onboarding contract

## Included entry paths

- Institutes use assisted provisioning through the platform/institute onboarding and roster tools. Institute administrators receive their scoped web workspace after activation.
- Students, teachers and limited-rollout parents may use public web registration. Their login is created first, then `/complete-profile` collects the role-specific record before the role workspace opens.
- The Android and iOS app accepts student accounts only. A student with incomplete setup is sent to the web profile form. Teacher, parent and administrator accounts receive a web-portal action and cannot enter student screens.

## First use

- Student: dashboard recommendation → assigned exam detail → start or resume when eligible.
- Teacher: dashboard → question bank or exam creation.
- Institute administrator: dashboard → academic setup, people or exam management.
- Parent: parent dashboard for the linked learner scope included in the rollout.

Every protected web layout checks active account state and role. Student, teacher and parent public roles must also complete onboarding. A mismatched role is returned to login rather than being routed into another workspace.

## Assisted pilot fallback

Support verifies the institute, username and intended role, then uses the existing institute roster/onboarding tools to correct or reprovision the account. Support must not ask for a password or move an account into another institute to bypass an onboarding error. Account recovery is handled separately under W07.02.
