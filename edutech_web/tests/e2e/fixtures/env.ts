export type PlaywrightRole = "admin" | "institute" | "teacher" | "student";

export type RoleCredentials = {
  username: string;
  password: string;
};

const roleEnvMap: Record<PlaywrightRole, { username: string; password: string }> = {
  admin: {
    username: "PLAYWRIGHT_ADMIN_USERNAME",
    password: "PLAYWRIGHT_ADMIN_PASSWORD",
  },
  institute: {
    username: "PLAYWRIGHT_INSTITUTE_USERNAME",
    password: "PLAYWRIGHT_INSTITUTE_PASSWORD",
  },
  teacher: {
    username: "PLAYWRIGHT_TEACHER_USERNAME",
    password: "PLAYWRIGHT_TEACHER_PASSWORD",
  },
  student: {
    username: "PLAYWRIGHT_STUDENT_USERNAME",
    password: "PLAYWRIGHT_STUDENT_PASSWORD",
  },
};

const roleDefaults: Record<PlaywrightRole, RoleCredentials> = {
  admin: {
    username: "demo-platform-admin",
    password: "Demo@12345",
  },
  institute: {
    username: "demo-institute-admin",
    password: "Demo@12345",
  },
  teacher: {
    username: "demo-teacher",
    password: "Demo@12345",
  },
  student: {
    username: "demo-student",
    password: "Demo@12345",
  },
};

export function getRoleCredentials(role: PlaywrightRole): RoleCredentials | null {
  const envKeys = roleEnvMap[role];
  const username = process.env[envKeys.username]?.trim();
  const password = process.env[envKeys.password]?.trim();

  if (!username || !password) {
    return roleDefaults[role];
  }

  return { username, password };
}

export function missingRoleEnvVars(role: PlaywrightRole) {
  const envKeys = roleEnvMap[role];
  return [envKeys.username, envKeys.password];
}
