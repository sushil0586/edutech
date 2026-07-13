import type { PlaywrightRole } from "../fixtures/env";

export type VisualPassRole = PlaywrightRole | "anonymous";

export type VisualPassEntry = {
  acceptedPaths?: string[];
  id: string;
  role: VisualPassRole;
  path: string;
  readyHeading?: RegExp;
  readyText?: RegExp;
};

export const visualPassManifest: VisualPassEntry[] = [
  { id: "marketing-home", role: "anonymous", path: "/", readyText: /nexora|exam|learning/i },
  { id: "login", role: "anonymous", path: "/login", readyHeading: /sign-in|welcome back/i },
  { id: "signup", role: "anonymous", path: "/signup", readyHeading: /sign up|create account/i },
  { id: "register", role: "anonymous", path: "/register", acceptedPaths: ["/register", "/signup"], readyHeading: /register|sign up|create account/i },

  { id: "admin-dashboard", role: "admin", path: "/admin", readyHeading: /dashboard/i },
  { id: "admin-exams", role: "admin", path: "/admin/exams", readyHeading: /exams/i },
  { id: "admin-people", role: "admin", path: "/admin/people", readyHeading: /people/i },
  { id: "admin-institutes", role: "admin", path: "/admin/institutes", readyHeading: /institutes/i },
  { id: "admin-academic-setup", role: "admin", path: "/admin/academic-setup", readyHeading: /academic setup/i },
  { id: "admin-economy", role: "admin", path: "/admin/economy", readyHeading: /economy/i },
  { id: "admin-reports", role: "admin", path: "/admin/reports", readyHeading: /reports/i },
  { id: "admin-security", role: "admin", path: "/admin/security", readyHeading: /security/i },
  { id: "admin-settings", role: "admin", path: "/admin/settings", readyHeading: /settings/i },
  { id: "admin-search", role: "admin", path: "/admin/search", readyHeading: /search/i },

  { id: "teacher-dashboard", role: "teacher", path: "/teacher/dashboard", readyHeading: /dashboard/i },
  { id: "teacher-exams", role: "teacher", path: "/teacher/exams", readyHeading: /exams/i },
  { id: "teacher-question-bank", role: "teacher", path: "/teacher/question-bank", readyHeading: /question bank/i },
  { id: "teacher-results", role: "teacher", path: "/teacher/results", readyHeading: /results/i },
  { id: "teacher-reviews", role: "teacher", path: "/teacher/reviews", readyHeading: /reviews/i },
  { id: "teacher-search", role: "teacher", path: "/teacher/search", readyHeading: /search/i },

  { id: "institute-dashboard", role: "institute", path: "/institute/dashboard", readyHeading: /dashboard/i },
  { id: "institute-exams", role: "institute", path: "/institute/exams", readyHeading: /exams/i },
  { id: "institute-question-bank", role: "institute", path: "/institute/question-bank", readyHeading: /question bank/i },
  { id: "institute-linked-questions", role: "institute", path: "/institute/question-bank/linked", readyHeading: /linked questions/i },
  { id: "institute-library-linker", role: "institute", path: "/institute/question-bank/library-linker", readyHeading: /shared library linker/i },
  { id: "institute-results", role: "institute", path: "/institute/results", readyHeading: /results/i },
  { id: "institute-reviews", role: "institute", path: "/institute/reviews", readyHeading: /reviews/i },
  { id: "institute-people", role: "institute", path: "/institute/people", readyHeading: /people/i },
  { id: "institute-academic-setup", role: "institute", path: "/institute/academic-setup", readyHeading: /academic setup/i },
  { id: "institute-reports", role: "institute", path: "/institute/reports", readyHeading: /reports/i },
  { id: "institute-economy", role: "institute", path: "/institute/economy", readyHeading: /economy/i },
  { id: "institute-security", role: "institute", path: "/institute/security", readyHeading: /security/i },
  { id: "institute-settings", role: "institute", path: "/institute/settings", readyHeading: /settings/i },
  { id: "institute-teacher-assignments", role: "institute", path: "/institute/teacher-assignments", readyHeading: /teacher assignments/i },
  { id: "institute-search", role: "institute", path: "/institute/search", readyHeading: /search/i },

  { id: "student-dashboard", role: "student", path: "/app/dashboard", readyHeading: /dashboard/i },
  { id: "student-exams", role: "student", path: "/app/exams", readyHeading: /exams|tests/i },
  { id: "student-attempts", role: "student", path: "/app/attempts", readyHeading: /attempts/i },
  { id: "student-results", role: "student", path: "/app/results", readyHeading: /results/i },
  { id: "student-analytics", role: "student", path: "/app/analytics", readyHeading: /analytics/i },
  { id: "student-practice", role: "student", path: "/app/practice", readyHeading: /practice/i },
  { id: "student-profile", role: "student", path: "/app/profile", readyHeading: /profile/i },
  { id: "student-settings", role: "student", path: "/app/settings", readyHeading: /settings/i },
  { id: "student-notifications", role: "student", path: "/app/notifications", readyHeading: /notifications/i },
  { id: "student-wallet", role: "student", path: "/app/wallet", readyHeading: /wallet/i },
  { id: "student-subscriptions", role: "student", path: "/app/subscriptions", readyHeading: /subscriptions/i },
  { id: "student-search", role: "student", path: "/app/search", readyHeading: /search/i },
  { id: "student-weak-areas", role: "student", path: "/app/weak-areas", readyHeading: /weak areas/i },
];
