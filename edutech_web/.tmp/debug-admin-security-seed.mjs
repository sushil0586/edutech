import { request } from '@playwright/test';

const apiBaseUrl = 'http://127.0.0.1:9001';
const username = process.env.PLAYWRIGHT_ADMIN_USERNAME || 'demo-platform-admin';
const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD || 'Demo@12345';
const adminInstituteCode = 'DLI001';
const canonicalAcademicYearName = '2026-2027';
const canonicalProgramName = 'Class 10 Foundation';

const ctx = await request.newContext();
const login = await ctx.post(`${apiBaseUrl}/api/v1/auth/login/`, { data: { username, password } });
const auth = await login.json();
const headers = { Authorization: `Bearer ${auth.access}`, 'Content-Type': 'application/json' };

async function get(path) {
  const res = await ctx.get(`${apiBaseUrl}${path}`, { headers });
  return await res.json();
}

const institutes = await get('/api/v1/institutes/?page_size=100');
const institute = institutes.results.find((e) => e.code === adminInstituteCode) || institutes.results[0];
const academicYears = await get(`/api/v1/academics/academic-years/?is_active=true&institute=${encodeURIComponent(institute.id)}&page_size=200`);
const academicYear = academicYears.results.find((e) => e.name.trim() === canonicalAcademicYearName) || academicYears.results[0];
const programs = await get(`/api/v1/academics/programs/?is_active=true&institute=${encodeURIComponent(institute.id)}&page_size=200`);
const program = programs.results.find((e) => e.name.trim() === canonicalProgramName) || programs.results[0];
const subjects = await get(`/api/v1/academics/subjects/?is_active=true&institute=${encodeURIComponent(institute.id)}&program=${encodeURIComponent(program.id)}&page_size=200`);
const subject = subjects.results.find((e) => !/^PW Sparse Subject\b/i.test(e.name)) || subjects.results[0];

const payload = {
  institute: institute.id,
  academic_year: academicYear.id,
  program: program.id,
  cohort: null,
  subject: subject.id,
  source_type: 'platform',
  title: `PW Admin Security Audit ${Date.now()}`,
  code: `PW-ASEC-${Date.now()}`,
  description: '',
  exam_type: 'quiz',
  delivery_mode: 'online',
  duration_minutes: 30,
  total_marks: '0',
  passing_marks: '0',
  start_at: null,
  end_at: null,
  instructions: '',
  allow_late_submit: false,
  randomize_questions: false,
  randomize_options: false,
  show_result_immediately: true,
  allow_review_after_submit: true,
  max_attempts: 1,
  timer_mode: 'global',
  navigation_mode: 'free_section',
  attempt_policy: 'single',
  result_publish_mode: 'immediate',
  review_mode: 'attempted_only',
  security_mode: 'standard',
  rank_visibility_mode: 'hidden',
  percentile_visibility_mode: 'hidden',
  benchmark_visibility_mode: 'peer_average_only',
  rank_freeze_policy: 'freeze_on_exam_closure',
  allow_resume: true,
  allow_section_switching: true,
  allow_return_to_previous_section: true,
  result_publish_at: null,
  review_available_from: null,
  review_available_until: null,
};

const create = await ctx.post(`${apiBaseUrl}/api/v1/exams/`, { headers, data: payload });
console.log('status', create.status());
console.log(await create.text());
await ctx.dispose();
