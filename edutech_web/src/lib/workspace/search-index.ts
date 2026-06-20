export type WorkspaceRole = "student" | "teacher" | "institute" | "admin" | "parent";

export type WorkspaceSearchEntry = {
  href: string;
  title: string;
  description: string;
  keywords: string[];
  section: string;
};

const workspaceSearchIndex: Record<WorkspaceRole, WorkspaceSearchEntry[]> = {
  student: [
    { href: "/app/dashboard", title: "Dashboard", description: "Overview of exams, progress, weak areas, and recommendations.", keywords: ["home", "overview", "progress", "recommendations"], section: "Core" },
    { href: "/app/exams", title: "Tests", description: "Browse available exams and mock tests.", keywords: ["exam", "mock", "test", "assessment"], section: "Core" },
    { href: "/app/practice", title: "Practice", description: "Open repeat practice sets and topic-wise drills.", keywords: ["practice", "drill", "topic", "revision"], section: "Core" },
    { href: "/app/results", title: "Results", description: "See published scores and result visibility.", keywords: ["score", "marks", "published", "performance"], section: "Core" },
    { href: "/app/attempts", title: "Attempts", description: "Track submitted and in-progress attempts.", keywords: ["attempt", "review", "summary", "submission"], section: "Core" },
    { href: "/app/analytics", title: "Analytics", description: "Inspect topic, subject, and question-level performance.", keywords: ["analytics", "topic", "subject", "question", "benchmark"], section: "Insights" },
    { href: "/app/weak-areas", title: "Weak Areas", description: "Review weakest topics and action signals.", keywords: ["weak", "improve", "topic", "needs work"], section: "Insights" },
    { href: "/app/notifications", title: "Alerts", description: "Check student notifications and status updates.", keywords: ["alerts", "messages", "notifications", "updates"], section: "Utilities" },
    { href: "/app/wallet", title: "Wallet", description: "Track stars, unlocks, and purchase history.", keywords: ["wallet", "stars", "credits", "unlocks", "orders"], section: "Utilities" },
    { href: "/app/subscriptions", title: "Subscriptions", description: "Review recurring plans and subscription orders.", keywords: ["subscription", "plan", "billing", "renewal"], section: "Utilities" },
    { href: "/app/profile", title: "Profile", description: "See account identity and academic context.", keywords: ["profile", "account", "identity", "school"], section: "Account" },
    { href: "/app/settings", title: "Settings", description: "Open session, portal guidance, and account controls.", keywords: ["settings", "logout", "session", "controls"], section: "Account" },
  ],
  teacher: [
    { href: "/teacher/dashboard", title: "Delivery Dashboard", description: "Track teacher-scoped delivery, insights, and exam movement.", keywords: ["dashboard", "overview", "delivery", "insights"], section: "Core" },
    { href: "/teacher/exams", title: "Exam Management", description: "Browse exams and open builder or delivery views.", keywords: ["exams", "builder", "delivery", "questions"], section: "Assessment" },
    { href: "/teacher/exams/new", title: "Quick Create Exam", description: "Create a new teacher exam quickly.", keywords: ["new exam", "create", "quick"], section: "Assessment" },
    { href: "/teacher/exams/advanced", title: "Advanced Exam Builder", description: "Compose multi-section exams with topic and difficulty controls.", keywords: ["advanced", "builder", "sections", "difficulty"], section: "Assessment" },
    { href: "/teacher/question-bank", title: "Question Bank", description: "Search, filter, and curate reusable questions.", keywords: ["question bank", "questions", "search", "filter", "tags"], section: "Content" },
    { href: "/teacher/question-bank/new", title: "Create Question", description: "Author a new reusable question.", keywords: ["new question", "create question", "author"], section: "Content" },
    { href: "/teacher/question-bank/import", title: "Import Questions", description: "Preview and import CSV question batches.", keywords: ["import", "csv", "questions", "template"], section: "Content" },
    { href: "/teacher/results", title: "Results", description: "Review attempts, interventions, and result readiness.", keywords: ["results", "attempts", "intervention", "publish"], section: "Insights" },
    { href: "/teacher/results/live", title: "Live Result Monitor", description: "Track active alerts, warnings, and intervention priorities.", keywords: ["live monitor", "alerts", "warnings", "intervention"], section: "Insights" },
    { href: "/teacher/results/attempts", title: "Attempt Review", description: "Inspect filtered attempt lists and attempt-by-attempt details.", keywords: ["attempt review", "attempts", "students", "force submit"], section: "Insights" },
    { href: "/teacher/results/leaderboard", title: "Result Leaderboard", description: "Review ranks, published states, and exam outcome ordering.", keywords: ["leaderboard", "ranks", "publish", "scores"], section: "Insights" },
    { href: "/teacher/results/analysis", title: "Result Analysis", description: "Review question difficulty, skipped patterns, and topic performance.", keywords: ["analysis", "topics", "questions", "hard questions", "skipped"], section: "Insights" },
  ],
  institute: [
    { href: "/institute/dashboard", title: "Dashboard", description: "Institute-wide operations, readiness, and insight summary.", keywords: ["dashboard", "overview", "operations", "readiness"], section: "Core" },
    { href: "/institute/exams", title: "Exams", description: "Manage institute-scoped exam delivery and builders.", keywords: ["exams", "builder", "delivery", "tests"], section: "Assessment" },
    { href: "/institute/exams/new", title: "Quick Create Exam", description: "Create a new institute exam quickly.", keywords: ["new exam", "create", "quick"], section: "Assessment" },
    { href: "/institute/exams/advanced", title: "Advanced Exam Builder", description: "Build multi-section institute exams.", keywords: ["advanced", "builder", "sections"], section: "Assessment" },
    { href: "/institute/results", title: "Results", description: "Inspect institute attempt and result workflows.", keywords: ["results", "attempts", "publish", "review"], section: "Insights" },
    { href: "/institute/results/live", title: "Live Result Monitor", description: "Track live attempt pressure, alerts, and intervention queues.", keywords: ["live monitor", "alerts", "warnings", "intervention"], section: "Insights" },
    { href: "/institute/results/attempts", title: "Attempt Review", description: "Inspect filtered attempt lists and student-level detail panels.", keywords: ["attempt review", "attempts", "students", "force submit"], section: "Insights" },
    { href: "/institute/results/leaderboard", title: "Result Leaderboard", description: "Review ranks, publication readiness, and top outcomes.", keywords: ["leaderboard", "ranks", "publish", "scores"], section: "Insights" },
    { href: "/institute/results/analysis", title: "Result Analysis", description: "Review topic performance, hard questions, and skipped patterns.", keywords: ["analysis", "topics", "questions", "hard questions", "skipped"], section: "Insights" },
    { href: "/institute/question-bank", title: "Question Bank", description: "Curate reusable institute question content.", keywords: ["question bank", "questions", "tags", "search"], section: "Content" },
    { href: "/institute/question-bank/new", title: "Create Question", description: "Add new institute question content.", keywords: ["new question", "author", "create"], section: "Content" },
    { href: "/institute/question-bank/import", title: "Import Questions", description: "Preview and import question CSV files.", keywords: ["import", "csv", "questions"], section: "Content" },
    { href: "/institute/people", title: "People", description: "Manage institute students, teachers, and roster views.", keywords: ["people", "students", "teachers", "roster"], section: "Operations" },
    { href: "/institute/academic-setup", title: "Academic Setup", description: "Configure programs, cohorts, and academic defaults.", keywords: ["academic", "setup", "program", "cohort", "subject"], section: "Operations" },
    { href: "/institute/teacher-assignments", title: "Teacher Assignments", description: "Coordinate teacher mapping and assignment coverage.", keywords: ["teacher assignments", "mapping", "allocation"], section: "Operations" },
    { href: "/institute/reports", title: "Reports", description: "Review aggregate institute reporting.", keywords: ["reports", "reporting", "summary"], section: "Operations" },
    { href: "/institute/economy", title: "Economy", description: "Inspect economy configuration and monetization signals.", keywords: ["economy", "pricing", "stars", "premium"], section: "Operations" },
    { href: "/institute/security", title: "Security", description: "Review security and integrity signals.", keywords: ["security", "integrity", "alerts"], section: "Operations" },
    { href: "/institute/settings", title: "Settings", description: "Open institute controls and portal guidance.", keywords: ["settings", "configuration", "controls"], section: "Operations" },
  ],
  admin: [
    { href: "/admin", title: "Dashboard", description: "Cross-institute readiness, platform health, and control overview.", keywords: ["dashboard", "overview", "platform", "health"], section: "Core" },
    { href: "/admin/exams", title: "Exams", description: "Review platform-level exam coverage and delivery state.", keywords: ["exams", "assessment", "delivery"], section: "Operations" },
    { href: "/admin/exams/new", title: "Quick Create Exam", description: "Create a new platform exam quickly.", keywords: ["new exam", "create", "quick"], section: "Operations" },
    { href: "/admin/exams/advanced", title: "Advanced Exam Builder", description: "Build complex platform exams with finer controls.", keywords: ["advanced", "builder", "sections"], section: "Operations" },
    { href: "/admin/institutes", title: "Institutes", description: "Search institutes, open details, and review readiness.", keywords: ["institutes", "directory", "school", "organization"], section: "Administration" },
    { href: "/admin/people", title: "People", description: "Manage people, onboarding, and platform roster views.", keywords: ["people", "users", "students", "teachers", "roster"], section: "Administration" },
    { href: "/admin/academic-setup", title: "Academic Setup", description: "Control academic defaults and structures.", keywords: ["academic", "setup", "program", "subject"], section: "Administration" },
    { href: "/admin/reports", title: "Reports", description: "Inspect platform-wide reporting.", keywords: ["reports", "reporting", "analytics"], section: "Administration" },
    { href: "/admin/economy", title: "Economy", description: "Review monetization and economy coverage.", keywords: ["economy", "pricing", "plans", "wallet"], section: "Administration" },
    { href: "/admin/security", title: "Security", description: "Review security, integrity, and platform safeguards.", keywords: ["security", "integrity", "alerts", "controls"], section: "Administration" },
    { href: "/admin/settings", title: "Settings", description: "Open platform settings and controls.", keywords: ["settings", "controls", "configuration"], section: "Administration" },
  ],
  parent: [
    { href: "/parent/dashboard", title: "Dashboard", description: "Family overview and linked children summary.", keywords: ["dashboard", "home", "family"], section: "Core" },
    { href: "/parent/children", title: "Children", description: "Inspect linked child accounts and identity details.", keywords: ["children", "students", "family"], section: "Core" },
    { href: "/parent/progress", title: "Progress", description: "Review family progress and learning updates.", keywords: ["progress", "results", "performance"], section: "Insights" },
    { href: "/parent/alerts", title: "Alerts", description: "Check parent notifications and alerts.", keywords: ["alerts", "notifications", "messages"], section: "Insights" },
    { href: "/parent/settings", title: "Settings", description: "Open parent account and workspace controls.", keywords: ["settings", "account", "controls"], section: "Account" },
  ],
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export function getWorkspaceSearchEntries(role: WorkspaceRole) {
  return workspaceSearchIndex[role];
}

export function searchWorkspaceEntries(role: WorkspaceRole, query: string) {
  const normalized = normalizeQuery(query);
  const entries = workspaceSearchIndex[role];

  if (!normalized) {
    return entries;
  }

  return entries
    .map((entry) => {
      const haystack = [entry.title, entry.description, entry.section, ...entry.keywords]
        .join(" ")
        .toLowerCase();
      const score =
        (entry.title.toLowerCase().includes(normalized) ? 4 : 0) +
        (entry.section.toLowerCase().includes(normalized) ? 2 : 0) +
        (entry.keywords.some((keyword) => keyword.toLowerCase().includes(normalized)) ? 2 : 0) +
        (haystack.includes(normalized) ? 1 : 0);

      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.title.localeCompare(right.entry.title))
    .map((item) => item.entry);
}
