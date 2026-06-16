export const primaryNavigation = [
  { href: "/", label: "Home" },
  { href: "/exams", label: "Exams" },
  { href: "/pricing", label: "Plans" },
  { href: "/schools", label: "Schools" },
  { href: "/resources", label: "Resources" },
] as const;

export const homePageContent = {
  hero: {
    eyebrow: "India's complete learning platform",
    titleLeading: "Better Practice.",
    titleAccent: "Better Scores. Brighter Future.",
    description:
      "Personalized study plans, topic-wise practice, weekly mock tests, performance analytics and parent tracking in one focused learning system.",
    benefits: [
      "Personalized study plans",
      "Weekly mock tests",
      "Real-time analytics",
    ],
    primaryCta: {
      href: "/signup",
      label: "Start free trial",
    },
    secondaryCta: {
      href: "/exams",
      label: "Explore mock tests",
    },
    trustPoints: [
      "No credit card required",
      "Cancel anytime",
      "Trusted by 25,000+ students",
    ],
  },
  heroPanel: {
    greeting: "Hi, Aarav!",
    subtext: "Let's continue your learning journey",
    status: "Live dashboard",
    navigation: [
      "Overview",
      "Study plan",
      "Practice",
      "Mock tests",
      "Performance",
      "Reports",
      "Achievements",
      "Bookmarks",
    ],
    stats: [
      {
        label: "Current rank",
        value: "128",
        note: "Top 5% in your class",
      },
      {
        label: "Tests taken",
        value: "32",
        note: "+12 this week",
      },
      {
        label: "Accuracy",
        value: "85%",
        note: "+8% this week",
      },
      {
        label: "Study streak",
        value: "12",
        note: "days",
      },
    ],
    todayPlan: [
      {
        title: "Algebra - Linear Equations",
        subtitle: "Practice 20 questions",
        status: "done",
      },
      {
        title: "Number System",
        subtitle: "Practice 15 questions",
        status: "current",
      },
      {
        title: "Mock Test - IMO Level 1",
        subtitle: "Full test (60 min)",
        status: "next",
      },
    ],
    upcoming: {
      title: "IMO Level 1 mock test",
      schedule: "20 May · 10:00 AM",
      cta: "View details",
    },
    subjectProgress: [
      { subject: "Mathematics", score: "85%", tone: "good", width: "85%" },
      { subject: "Science", score: "72%", tone: "mid", width: "72%" },
      { subject: "Mental ability", score: "64%", tone: "warn", width: "64%" },
      { subject: "English", score: "60%", tone: "warn", width: "60%" },
    ],
  },
  statsBand: [
    { value: "25,000+", label: "Happy students", tone: "violet" },
    { value: "5000+", label: "Practice questions", tone: "blue" },
    { value: "200+", label: "Mock tests", tone: "green" },
    { value: "98%", label: "Parent satisfaction", tone: "amber" },
  ],
  features: {
    eyebrow: "Everything you need to improve",
    title: "Powerful tools designed to help students learn better and score higher.",
    items: [
      {
        icon: "◎",
        title: "Personalized study plans",
        body: "AI-assisted plans that stay aligned to class, level, and exam goals.",
      },
      {
        icon: "◫",
        title: "Topic-wise practice",
        body: "Practice by topic and level so weak areas become visible much earlier.",
      },
      {
        icon: "◌",
        title: "Weekly mock tests",
        body: "Real exam-like timed practice with review, summary, and continuity.",
      },
      {
        icon: "▥",
        title: "Performance analytics",
        body: "Track ranks, streaks, accuracy, and subject-level readiness over time.",
      },
      {
        icon: "◉",
        title: "Parent tracking",
        body: "Parents get simple readiness visibility without entering the student workflow.",
      },
      {
        icon: "△",
        title: "Teacher workspace",
        body: "Teachers create tests, manage question banks, and review outcomes in one place.",
      },
    ],
  },
  showcase: {
    eyebrow: "See Nexora in action",
    title: "Simple, beautiful, and easy to use for everyone.",
    cards: [
      {
        title: "Student dashboard",
        accent: "violet",
        stats: [
          { label: "Overall progress", value: "78%" },
          { label: "Tests taken", value: "32" },
          { label: "Accuracy", value: "85%" },
          { label: "Current rank", value: "128" },
        ],
      },
      {
        title: "Mock test experience",
        accent: "blue",
        stats: [
          { label: "Exam", value: "IMO Level 1" },
          { label: "Question", value: "Q.12" },
          { label: "Time left", value: "00:59:46" },
          { label: "Mode", value: "Submit test" },
        ],
      },
      {
        title: "Parent progress report",
        accent: "mint",
        stats: [
          { label: "Study time", value: "8h 45m" },
          { label: "Tests taken", value: "3" },
          { label: "Accuracy", value: "84%" },
          { label: "Best subject", value: "Mathematics" },
        ],
      },
    ],
  },
  testimonials: {
    eyebrow: "Loved by students, trusted by parents",
    items: [
      {
        quote:
          "Nexora's mock tests are excellent. They are very similar to real Olympiad exams.",
        author: "Aarav Sharma",
        role: "Class 6",
      },
      {
        quote:
          "I can see my child's improvement every week. The reports are very helpful.",
        author: "Priya Verma",
        role: "Parent",
      },
      {
        quote:
          "Easy to use and saves a lot of time in test creation and evaluation.",
        author: "Rahul Mehta",
        role: "Teacher",
      },
    ],
    community: {
      title: "Join thousands of students achieving their dreams with Nexora.",
      stat: "+25K",
    },
  },
  finalCta: {
    title: "Give your child a competitive edge",
    description:
      "Start learning smarter, practicing better and achieving higher with the same sober Nexora experience across every workspace.",
    primaryCta: {
      href: "/signup?role=student",
      label: "Start free trial",
    },
    bullets: [
      "30 days free",
      "No credit card",
      "Cancel anytime",
    ],
    trust: "Trusted by 25,000+ students",
  },
  roleCards: {
    eyebrow: "Built for every role",
    title: "One product system for students, parents, and teachers.",
    description:
      "The same design language, same account model, and the right workspace after login.",
  },
  trustBar: {
    title: "Built for one shared launch experience",
    logos: ["Student", "Parent", "Teacher", "Shared account"],
  },
  categories: {
    eyebrow: "What the launch supports",
    title: "Three public roles, one product system.",
    description:
      "One polished flow, one shared database area, and the right workspace after login.",
    items: [
      {
        icon: "S",
        title: "Student onboarding",
        subtitle: "Class, board, exams",
        body: "Students enter a light form that adapts to class level, board, and exam interest.",
        href: "/signup?role=student",
      },
      {
        icon: "P",
        title: "Parent onboarding",
        subtitle: "Child readiness",
        body: "Parents start with a simple account and the child context needed for alerts.",
        href: "/signup?role=parent",
      },
      {
        icon: "T",
        title: "Teacher onboarding",
        subtitle: "Teaching focus",
        body: "Teachers register with the details needed for exam creation and review.",
        href: "/signup?role=teacher",
      },
    ],
  },
} as const;

export const marketingPages = {
  exams: {
    eyebrow: "Exam library",
    title: "Explore readiness journeys across school, competitive, and board-level prep.",
    description:
      "Nexora organizes guided practice, readiness analytics, and attempt review flows around the exams learners actually prepare for.",
    bullets: [
      "School board practice with chapter and unit progression",
      "Competitive exam readiness with topic-level performance tracking",
      "Board and Olympiad preparation with repeat-attempt visibility",
    ],
  },
  schools: {
    eyebrow: "For schools",
    title: "A structured exam practice layer for institutes and school programs.",
    description:
      "Give students a consistent exam environment with scoped assignments, tracked attempts, result visibility rules, and learner-specific analytics.",
    bullets: [
      "Student-scoped assignments and controlled exam availability",
      "Progress visibility for readiness, weak areas, and recent attempts",
      "Backend-ready reporting flows for institutions and admins",
    ],
  },
  professionals: {
    eyebrow: "For professionals",
    title: "Focused preparation built for repeat practice and measurable improvement.",
    description:
      "Nexora helps learners practice in realistic exam conditions and revisit summaries, reviews, and weak-topic analytics after every attempt.",
    bullets: [
      "Resume in-progress attempts from any active session",
      "Review results, summaries, and attempt history in one place",
      "Track weak areas before the next certification window",
    ],
  },
  pricing: {
    eyebrow: "Pricing model",
    title: "Platform access can be tailored to institutions, cohorts, and learner programs.",
    description:
      "The current product flow is admin-managed, so pricing and onboarding stay aligned to institute setup, cohort size, and program scope.",
    bullets: [
      "Institution-first onboarding instead of public self-checkout",
      "Role-based platform access for students, teachers, and admins",
      "Exam, attempt, and reporting workflows aligned to backend configuration",
    ],
  },
  resources: {
    eyebrow: "Resources",
    title: "Reference material, readiness guidance, and platform onboarding can live alongside the learner workflow.",
    description:
      "This area can become the content layer for exam strategy, onboarding, and support resources that complement the live product experience.",
    bullets: [
      "Exam strategy and preparation guides",
      "Institution onboarding and support references",
      "Product education for student and professional learners",
    ],
  },
} as const;

export const portalAccessLanes = [
  {
    role: "student",
    badge: "Learner lane",
    title: "Student access",
    description:
      "Students create a learner profile and reach the student workspace.",
    loginHref: "/login?role=student",
    signupHref: "/signup?role=student",
    ctaLabel: "Continue to student login",
    note:
      "Public and guided. The form stays light while collecting the class, board, and exam context.",
    highlights: [
      "Practice and mock tests",
      "Progress tracking",
      "Best fit for school and institute learners",
    ],
  },
  {
    role: "teacher",
    badge: "Teaching lane",
    title: "Teacher access",
    description:
      "Teachers create a teaching profile and open the teaching workspace.",
    loginHref: "/login?role=teacher",
    signupHref: "/signup?role=teacher",
    ctaLabel: "Continue to teacher login",
    note:
      "Public and guided. It asks only for the details needed to shape the teaching workspace.",
    highlights: [
      "Exam creation",
      "Question bank",
      "Results review",
    ],
  },
  {
    role: "institute_admin",
    badge: "Institution lane",
    title: "Institute admin access",
    description:
      "Institute admins manage setup, rosters, academic structure, and operational rollout for their organisation.",
    loginHref: "/login?role=institute_admin",
    signupHref: "/signup?role=institute_admin",
    ctaLabel: "Continue to institute login",
    note:
      "This lane is best for school and institute operators who oversee setup, onboarding, and managed access.",
    highlights: [
      "Roster and academic master data",
      "Teacher and student onboarding",
      "Setup, settings, and support operations",
    ],
  },
  {
    role: "platform_admin",
    badge: "Control lane",
    title: "Platform admin access",
    description:
      "Platform admins use this lane for internal governance, tenant support, and the top-level operating view.",
    loginHref: "/login?role=platform_admin",
    signupHref: "/signup?role=platform_admin",
    ctaLabel: "Continue to admin login",
    note:
      "Platform admin access is internal and should stay limited to trusted operators.",
    highlights: [
      "Cross-institute oversight",
      "Platform configuration and support",
      "Operational governance and controls",
    ],
  },
  {
    role: "parent",
    badge: "Family lane",
    title: "Parent access",
    description:
      "Parents create a family profile and reach the linked workspace.",
    loginHref: "/login?role=parent",
    signupHref: "/signup?role=parent",
    ctaLabel: "Continue to parent login",
    note:
      "Public and guided. Child-linking can be completed later.",
    highlights: [
      "Child readiness",
      "Linked alerts",
      "Family workspace",
    ],
  },
] as const;

export const publicPortalAccessLanes = portalAccessLanes.filter(
  (lane) => lane.role === "student" || lane.role === "parent" || lane.role === "teacher",
);

export const internalPortalAccessLanes = portalAccessLanes.filter(
  (lane) => lane.role === "institute_admin" || lane.role === "platform_admin",
);

export type MarketingPageSlug = keyof typeof marketingPages;
