import { execFileSync } from "node:child_process";
import path from "node:path";

const backendRoot = path.resolve(process.cwd(), "../edutech_backend");
const pythonExecutable = path.join(backendRoot, ".venv", "bin", "python");
const managePyPath = path.join(backendRoot, "manage.py");

function resolveTargetInstituteCode(preferredInstituteCode?: string) {
  const configuredInstituteCode =
    preferredInstituteCode?.trim() ||
    process.env.PLAYWRIGHT_DEMO_SHARED_LIBRARY_TARGET_INSTITUTE_CODE?.trim() ||
    process.env.PLAYWRIGHT_INSTITUTE_CODE?.trim();

  if (configuredInstituteCode) {
    return configuredInstituteCode;
  }

  const fallbackCandidates = ["DLI001", "OPBMS"];
  for (const candidate of fallbackCandidates) {
    try {
      execFileSync(
        pythonExecutable,
        [
          managePyPath,
          "shell",
          "-c",
          [
            "from apps.institutes.models import Institute",
            `import sys; sys.exit(0 if Institute.objects.filter(code='${candidate}').exists() else 1)`,
          ].join("; "),
        ],
        {
          cwd: process.cwd(),
          stdio: "pipe",
          env: process.env,
        },
      );
      return candidate;
    } catch {
      // Try the next fallback.
    }
  }

  return "DLI001";
}

function runManagePyCommand(args: string[]) {
  execFileSync(pythonExecutable, [managePyPath, ...args], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: process.env,
  });
}

function resolveDonorInstituteCode() {
  return (
    process.env.PLAYWRIGHT_DEMO_SHARED_LIBRARY_DONOR_INSTITUTE_CODE?.trim() ||
    "PUB001"
  );
}

function laneSubjectOverride(lane: "base" | "unentitled" | "quota" | "blocked" | "paused") {
  const envMap = {
    base: "PLAYWRIGHT_DEMO_SHARED_LIBRARY_BASE_SUBJECT_CODE",
    unentitled: "PLAYWRIGHT_DEMO_SHARED_LIBRARY_UNENTITLED_SUBJECT_CODE",
    quota: "PLAYWRIGHT_DEMO_SHARED_LIBRARY_QUOTA_SUBJECT_CODE",
    blocked: "PLAYWRIGHT_DEMO_SHARED_LIBRARY_BLOCKED_SUBJECT_CODE",
    paused: "PLAYWRIGHT_DEMO_SHARED_LIBRARY_PAUSED_SUBJECT_CODE",
  } as const;
  return process.env[envMap[lane]]?.trim() || "";
}

function chooseDistinctSubjects(
  compatibleSubjectCodes: string[],
  fallbackSubjectCodes: string[],
  laneOrder: Array<"base" | "unentitled" | "quota" | "blocked" | "paused">,
) {
  const compatibleCodes = [...new Set(compatibleSubjectCodes.filter((code) => code.trim()))];
  const fallbackCodes = [...new Set(fallbackSubjectCodes.filter((code) => code.trim()))];
  const allCodes = [...new Set([...compatibleCodes, ...fallbackCodes])];
  if (allCodes.length === 0) {
    throw new Error("No subject codes available.");
  }

  const lanesRequiringCompatibleCoverage = new Set(["base", "quota", "blocked", "paused"]);
  const chosenByLane = new Map<string, string>();
  const usedCompatibleCodes = new Set<string>();
  const usedFallbackCodes = new Set<string>();

  for (const lane of laneOrder) {
    const override = laneSubjectOverride(lane);
    if (override) {
      chosenByLane.set(lane, override);
      continue;
    }

    const compatibleCandidate =
      compatibleCodes.find((code) => !usedCompatibleCodes.has(code)) ??
      compatibleCodes[0] ??
      null;
    const fallbackCandidate =
      allCodes.find((code) => !usedFallbackCodes.has(code)) ??
      allCodes[0];

    const nextCode =
      lanesRequiringCompatibleCoverage.has(lane) && compatibleCandidate
        ? compatibleCandidate
        : compatibleCandidate ?? fallbackCandidate;

    chosenByLane.set(lane, nextCode);
    if (compatibleCodes.includes(nextCode)) {
      usedCompatibleCodes.add(nextCode);
    }
    usedFallbackCodes.add(nextCode);
  }

  return {
    base: chosenByLane.get("base") ?? allCodes[0],
    unentitled: chosenByLane.get("unentitled") ?? allCodes[0],
    quota: chosenByLane.get("quota") ?? allCodes[0],
    blocked: chosenByLane.get("blocked") ?? allCodes[0],
    paused: chosenByLane.get("paused") ?? allCodes[0],
  };
}

function resolveSeedSubjectCodes(targetInstituteCode: string) {
  const donorInstituteCode = resolveDonorInstituteCode();

  try {
    const rawOutput = execFileSync(
      pythonExecutable,
      [
        managePyPath,
        "shell",
        "-c",
        [
          "import json",
          "from apps.academics.models import Subject",
          "from apps.question_bank.models import MasterQuestion",
          `donor_codes = list(` +
            "MasterQuestion.objects.filter(" +
            `source_institute__code='${donorInstituteCode}', ` +
            "is_active=True, source_subject__isnull=False" +
            ").order_by('source_subject__code').values_list('source_subject__code', flat=True).distinct())",
          `target_codes = set(Subject.objects.filter(institute__code='${targetInstituteCode}', is_active=True).values_list('code', flat=True))`,
          "compatible = [code for code in donor_codes if code and code in target_codes]",
          "fallback = [code for code in donor_codes if code]",
          "print(json.dumps({'compatible': compatible[:8], 'fallback': fallback[:8]}))",
        ].join("; "),
      ],
      {
        cwd: process.cwd(),
        stdio: "pipe",
        env: process.env,
      },
    )
      .toString()
      .trim();

    const parsed = JSON.parse(rawOutput) as {
      compatible?: string[];
      fallback?: string[];
    };
    const compatibleCodes = (parsed.compatible ?? [])
      .filter((code) => typeof code === "string" && code.trim())
      .map((code) => code.trim());
    const fallbackCodes = (parsed.fallback ?? [])
      .filter((code) => typeof code === "string" && code.trim())
      .map((code) => code.trim());
    const selectedSubjects = chooseDistinctSubjects(compatibleCodes, fallbackCodes, [
      "base",
      "unentitled",
      "quota",
      "blocked",
      "paused",
    ]);
    return {
      donorInstituteCode,
      ...selectedSubjects,
    };
  } catch {
    const fallbackSubjects = chooseDistinctSubjects(
      ["CLS7-MATH", "CLS7-SCI", "CLS8-MATH"],
      ["CLS7-MATH", "DM-NEET-BIO", "DM-AWS-CP", "AWS-CP", "CLS8-SCI"],
      ["base", "unentitled", "quota", "blocked", "paused"],
    );
    return {
      donorInstituteCode,
      ...fallbackSubjects,
    };
  }
}

export function resetAndSeedDemoSharedLibraryWorkflow(targetInstituteCode?: string) {
  const resolvedInstituteCode = resolveTargetInstituteCode(targetInstituteCode);
  const subjectCodes = resolveSeedSubjectCodes(resolvedInstituteCode);
  runManagePyCommand([
    "reset_demo_shared_library_workflow",
    "--target-institute-code",
    resolvedInstituteCode,
  ]);
  runManagePyCommand([
    "seed_demo_shared_library_access",
    "--target-institute-code",
    resolvedInstituteCode,
    "--donor-institute-code",
    subjectCodes.donorInstituteCode,
    "--subject-code",
    subjectCodes.base,
    "--unentitled-subject-code",
    subjectCodes.unentitled,
    "--quota-demo-subject-code",
    subjectCodes.quota,
    "--blocked-matchable-subject-code",
    subjectCodes.blocked,
    "--paused-only-subject-code",
    subjectCodes.paused,
  ]);
}
