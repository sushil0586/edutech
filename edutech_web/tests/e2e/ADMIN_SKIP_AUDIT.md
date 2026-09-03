# Admin Skip Audit

Generated on July 29, 2026 from static inspection of `test.skip(...)` declarations in `edutech_web/tests/e2e/workflow/admin-*`.

## Summary

- Files with skip declarations: `149`
- `credential/role gate` hits: `151`
- `cross-role prerequisite` hits: `0`
- `environment/seed-data dependent` hits: `26`
- `other/manual review` hits: `90`

## Interpretation

- Most admin skips are intentional guards, not product failures.
- The biggest unverified surfaces are mutable tests that need seeded institutes, entitlements, subscription requests, package mappings, or multi-role fixtures.
- Any file tagged with `cross-role prerequisite` should be treated as requiring coordinated fixtures before unskipping.

## File Audit

### `admin-academic-setup-api-audit.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-academic-setup-crud-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminAcademicSetupActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ACADEMIC_SETUP_ACTIONS", "admin academic setup CRUD guardrail coverage",`

### `admin-academic-setup-crud-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminAcademicSetupActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ACADEMIC_SETUP_ACTIONS", "admin academic setup CRUD guardrail coverage",`

### `admin-academic-setup-mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminAcademicSetupActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ACADEMIC_SETUP_ACTIONS", "disposable admin academic setup coverage",`

### `admin-academic-setup-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-advanced-builder-templates-mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminAdvancedBuilderActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS", "disposable admin advanced builder template coverage",`

### `admin-advanced-builder-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-aws-results-contract.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-class8-math-master-dataset.mutable.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-class8-math-master-dataset.mutable.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-cross-browser-deep-routes.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-cross-browser-shell.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-dashboard-api-audit.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-dashboard-redirect.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-dashboard-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-economy-api-audit.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-economy-browser-coverage.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin economy browser mutable policy coverage",`

### `admin-economy-cross-role-package-propagation.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin to institute package-plan propagation coverage",`

### `admin-economy-cross-role-package-propagation.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin to institute package-plan propagation coverage",`

### `admin-economy-crud-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin economy CRUD guardrail coverage",`

### `admin-economy-crud-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin economy CRUD guardrail coverage",`

### `admin-economy-mutable.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin economy star grant coverage",`
- Skip sample: `true, "No attachable question-bank packages are currently available for subscription plan mapping."`
- Skip sample: `true, "No institute is available for subscription-plan governance coverage."`

### `admin-economy-navigation.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-economy-timing.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-economy-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-exam-assignment-mode-matrix.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamCreationEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS", "platform-admin assignment-mode enumeration coverage",`

### `admin-exam-assignment-mode-matrix.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamCreationEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS", "platform-admin assignment-mode enumeration coverage",`

### `admin-exam-builder-mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS", "disposable admin exam builder coverage",`

### `admin-exam-builder-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-exam-creation-advanced-matrix.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS", "platform-admin advanced-builder exam creation matrix coverage",`

### `admin-exam-creation-advanced-matrix.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS", "platform-admin advanced-builder exam creation matrix coverage",`

### `admin-exam-creation-advanced-student-attempt.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminStudentAttemptEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS", "admin advanced-builder student attempt coverage",`

### `admin-exam-creation-advanced-student-attempt.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminStudentAttemptEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS", "admin advanced-builder student attempt coverage",`

### `admin-exam-creation-wizard-matrix.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamCreationEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS", "platform-admin guided exam creation matrix coverage",`

### `admin-exam-creation-wizard-matrix.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamCreationEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS", "platform-admin guided exam creation matrix coverage",`

### `admin-exam-detail-mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamDetailActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS", "disposable admin exam detail coverage",`

### `admin-exam-detail-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-exam-policy-security-matrix.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamDetailActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS", "platform-admin policy and security breadth coverage",`

### `admin-exam-policy-security-matrix.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamDetailActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS", "platform-admin policy and security breadth coverage",`

### `admin-exam-slot-api-audit.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamDetailActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS", "slot-management API audit coverage",`

### `admin-exam-slot-management.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamDetailActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS", "disposable admin slot-management coverage",`

### `admin-exam-slot-management.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamDetailActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS", "disposable admin slot-management coverage",`

### `admin-exams-api-audit.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-exams-browser-coverage.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-exams-create-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamCreateActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_CREATE_ACTIONS", "admin exam create wizard guardrail coverage",`

### `admin-exams-create-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamCreateActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_CREATE_ACTIONS", "admin exam create wizard guardrail coverage",`

### `admin-exams-create-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-exams-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-family-authoring-contracts.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-family-guided-create-defaults.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-family-guided-persistence.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamCreationEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS", "platform-admin guided family persistence coverage",`

### `admin-family-guided-persistence.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamCreationEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS", "platform-admin guided family persistence coverage",`

### `admin-family-immediate-release.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled || !mutableStudentAttemptActionsEnabled, "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS=1 and PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 for admin family immediate-release covera`

### `admin-family-immediate-release.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled || !mutableStudentAttemptActionsEnabled, "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS=1 and PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 for admin family immediate-release covera`

### `admin-family-preset-builder-handoff.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-family-preset-packs.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-family-preset-persistence.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS", "admin family preset persistence coverage",`

### `admin-family-preset-persistence.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS", "admin family preset persistence coverage",`

### `admin-family-release-happy-path.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled || !mutableStudentAttemptActionsEnabled, "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS=1 and PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 for admin family release coverage.",`

### `admin-family-release-happy-path.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled || !mutableStudentAttemptActionsEnabled, "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS=1 and PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 for admin family release coverage.",`

### `admin-form-validation-browser-coverage.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `true, "No concrete institute option is available for question-bank package validation coverage."`
- Skip sample: `true, "No concrete institute option is available for subscription-plan validation coverage."`
- Skip sample: `true, "A concrete active institute is required for subscription-plan apply validation coverage."`

### `admin-gre-results-contract.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!liveExam || !publishedExam, "GRE seeded demo exams are not available in this environment, so this contract cannot assert admin parity here.",`

### `admin-institute-blank-onboarding-operations.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingProfilesEnabled || !mutableRosterActionsEnabled, "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1 and PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS=1 for blank onboarding operational coverage.",`

### `admin-institute-blank-onboarding-operations.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingProfilesEnabled || !mutableRosterActionsEnabled, "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1 and PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS=1 for blank onboarding operational coverage.",`

### `admin-institute-consolidated-regression.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingTypesEnabled || !mutableAdminEconomyActionsEnabled || !mutableRosterActionsEnabled || !mutableExamActionsEnabled, "Enable mutable onboarding, economy, roster, and exam flags for consolidated regression coverage.",`

### `admin-institute-consolidated-regression.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingTypesEnabled || !mutableAdminEconomyActionsEnabled || !mutableRosterActionsEnabled || !mutableExamActionsEnabled, "Enable mutable onboarding, economy, roster, and exam flags for consolidated regression coverage.",`

### `admin-institute-economy-policy-contract.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminInstituteEconomyPolicyEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ECONOMY_POLICY_CONTRACT", "admin to institute economy policy contract coverage",`

### `admin-institute-economy-policy-contract.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminInstituteEconomyPolicyEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ECONOMY_POLICY_CONTRACT", "admin to institute economy policy contract coverage",`

### `admin-institute-management-mode.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminInstituteManagementModeEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS", "admin institute management mode browser coverage",`
- Skip sample: `testRequiresRole("institute"`

### `admin-institute-management-mode.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminInstituteManagementModeEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS", "admin institute management mode browser coverage",`
- Skip sample: `testRequiresRole("institute"`

### `admin-institute-onboarding-profiles.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingProfilesEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES", "admin onboarding profile browser coverage",`

### `admin-institute-onboarding-profiles.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingProfilesEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES", "admin onboarding profile browser coverage",`

### `admin-institute-onboarding-recovery.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingRecoveryEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES", "admin onboarding recovery browser coverage",`

### `admin-institute-onboarding-recovery.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingRecoveryEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES", "admin onboarding recovery browser coverage",`

### `admin-institute-onboarding-roster-bootstrap.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingProfilesEnabled || !mutableRosterActionsEnabled, "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1 and PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS=1 for onboarding roster bootstrap coverage.",`

### `admin-institute-onboarding-roster-bootstrap.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingProfilesEnabled || !mutableRosterActionsEnabled, "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1 and PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS=1 for onboarding roster bootstrap coverage.",`

### `admin-institute-onboarding-validation.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingValidationEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES", "admin onboarding validation browser coverage",`

### `admin-institute-onboarding-validation.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingValidationEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES", "admin onboarding validation browser coverage",`

### `admin-institute-question-bank-feature-recovery.mutable.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin to institute question-bank feature recovery coverage",`
- Skip sample: `true, "No active institute question-bank entitlement exists to seed a bulk-import feature row."`

### `admin-institute-question-bank-feature-recovery.mutable.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin to institute question-bank feature recovery coverage",`
- Skip sample: `true, "No active institute question-bank entitlement exists to seed a bulk-import feature row."`

### `admin-institute-subscription-request.mutable.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent, other/manual review`
- Skip sample: `true, "No requestable subscription cycle currently exposes a package that is not already active for the institute.",`
- Skip sample: `true, "The just-created institute subscription request is not visible as pending in the admin queue.",`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableInstituteSubscriptionRequestEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SUBSCRIPTION_REQUEST", "institute subscription request workflow coverage",`

### `admin-institute-subscription-request.mutable.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent, other/manual review`
- Skip sample: `true, "No requestable subscription cycle currently exposes a package that is not already active for the institute.",`
- Skip sample: `true, "The just-created institute subscription request is not visible as pending in the admin queue.",`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableInstituteSubscriptionRequestEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SUBSCRIPTION_REQUEST", "institute subscription request workflow coverage",`

### `admin-institutes-api-audit.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-institutes-crud-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminInstituteActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS", "admin institute CRUD guardrail coverage",`

### `admin-institutes-crud-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminInstituteActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS", "admin institute CRUD guardrail coverage",`

### `admin-institutes-mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminInstituteActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS", "disposable admin institute create and edit coverage",`

### `admin-institutes-sparse-edit.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminInstituteActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS", "admin institute sparse edit regression coverage",`

### `admin-institutes-sparse-edit.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminInstituteActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS", "admin institute sparse edit regression coverage",`

### `admin-institutes-timing.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-institutes-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-jee-results-contract.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-language-family-preset-builder-handoff.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-mixed-institute-onboarding.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingTypesEnabled || !mutableAdminEconomyActionsEnabled, "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1 and PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS=1 for mixed institute onboarding coverage.",`

### `admin-mixed-institute-onboarding.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingTypesEnabled || !mutableAdminEconomyActionsEnabled, "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1 and PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS=1 for mixed institute onboarding coverage.",`

### `admin-mobile-economy-workflow.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-mobile-people-workflow.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-mobile-reports-workflow.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-mobile-security-workflow.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-multi-institute-assignment-isolation.mutable.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-multi-institute-assignment-isolation.mutable.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-multi-institute-pilot.mutable.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent, other/manual review`
- Skip sample: `true, "Admin student login provisioning is currently throttled by the backend cooldown window.",`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminStudentAttemptEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS", "multi-institute disposable pilot coverage",`

### `admin-multi-institute-pilot.mutable.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent, other/manual review`
- Skip sample: `true, "Admin student login provisioning is currently throttled by the backend cooldown window.",`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminStudentAttemptEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS", "multi-institute disposable pilot coverage",`

### `admin-multi-subject-contract.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-multi-subject-results-contract.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!exam, "Mixed-subject seeded practice exam is not available in this environment, so this contract cannot assert admin parity here.",`

### `admin-neet-results-contract.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-onboarding-types.mutable.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingTypesEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES", "admin onboarding mode browser coverage",`
- Skip sample: `true, "No active platform-managed question-bank package is available for master-default onboarding."`

### `admin-onboarding-types.mutable.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingTypesEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES", "admin onboarding mode browser coverage",`
- Skip sample: `true, "No active platform-managed question-bank package is available for master-default onboarding."`

### `admin-order-confirm-rejection.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-package-scope-expansion-institute-linker.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingTypesEnabled || !mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES / PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin package scope expansion institute pr`

### `admin-package-scope-expansion-institute-linker.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingTypesEnabled || !mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES / PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin package scope expansion institute pr`

### `admin-package-scope-recovery-institute-linked.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingTypesEnabled || !mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES / PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin package-scope recovery from the inst`

### `admin-package-scope-recovery-institute-linked.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminOnboardingTypesEnabled || !mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES / PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin package-scope recovery from the inst`

### `admin-people-api-audit.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-people-crud-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminRosterActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ROSTER_ACTIONS", "admin people CRUD guardrail coverage",`

### `admin-people-crud-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminRosterActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ROSTER_ACTIONS", "admin people CRUD guardrail coverage",`

### `admin-people-timing.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-people-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-preset-library-persistence.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS", "admin managed preset pack exam-creation persistence coverage",`

### `admin-preset-library-persistence.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS", "admin managed preset pack exam-creation persistence coverage",`

### `admin-preset-pack-library-mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS", "disposable admin preset pack library coverage",`

### `admin-preset-pack-library.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-question-bank-opbms-scope.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin OPBMS question-bank scope coverage",`

### `admin-question-bank-opbms-scope.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminEconomyActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS", "admin OPBMS question-bank scope coverage",`

### `admin-question-bank-package-editor.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-question-bank-package-visibility.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-reports-api-audit.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-reports-browser-coverage.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-reports-timing.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-reports-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-request-queue-review-rejection.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent, other/manual review`
- Skip sample: `true, "No requestable subscription cycle currently exposes a package that is not already active for the institute.",`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `true, "The just-created institute subscription request is not visible as pending in the admin queue.",`

### `admin-results-partial-distribution.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled || !mutableStudentAttemptActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS", "admin partial multi-learner leaderboard distribution coverage",`

### `admin-results-partial-distribution.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminExamBuilderActionsEnabled || !mutableStudentAttemptActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS", "admin partial multi-learner leaderboard distribution coverage",`

### `admin-roster-import-mutable.spec.ts`
- Categories: `credential/role gate, environment/seed-data dependent, other/manual review`
- Skip sample: `true, "Roster import preview is currently throttled by the backend cooldown window."`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminRosterActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ROSTER_ACTIONS", "disposable admin roster import coverage",`

### `admin-roster-mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminRosterActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ROSTER_ACTIONS", "disposable admin roster mutation coverage",`

### `admin-search-api-audit.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-search-browser-coverage.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-search-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-security-api-audit.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-security-browser-coverage.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-security-timing.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-security-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-settings-api-audit.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-settings-browser-coverage.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-settings-crud-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminSettingsActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_SETTINGS_ACTIONS", "admin settings CRUD guardrail coverage",`

### `admin-settings-crud-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminSettingsActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_SETTINGS_ACTIONS", "admin settings CRUD guardrail coverage",`

### `admin-settings-timing.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-settings-workspace.spec.ts`
- Categories: `credential/role gate`
- Skip sample: `testRequiresRole("admin"`

### `admin-teacher-assignments-crud-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminTeacherAssignmentActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_TEACHER_ASSIGNMENT_ACTIONS", "admin teacher-assignment CRUD guardrail coverage",`

### `admin-teacher-assignments-crud-guardrails.mutable.spec.ts`
- Categories: `credential/role gate, other/manual review`
- Skip sample: `testRequiresRole("admin"`
- Skip sample: `!mutableAdminTeacherAssignmentActionsEnabled, mutableLaneMessage( "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_TEACHER_ASSIGNMENT_ACTIONS", "admin teacher-assignment CRUD guardrail coverage",`
