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

  const fallbackCandidates = ["OPBMS", "DLI001"];
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

  return "OPBMS";
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

function resolveSeedSubjectCodes() {
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
          "from apps.question_bank.models import MasterQuestion",
          `codes = list(` +
            "MasterQuestion.objects.filter(" +
            `source_institute__code='${donorInstituteCode}', ` +
            "is_active=True, source_subject__isnull=False" +
            ").values_list('source_subject__code', flat=True).distinct()[:8])",
          "print(json.dumps([code for code in codes if code]))",
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

    const parsed = JSON.parse(rawOutput) as string[];
    const subjectCodes = parsed.filter((code) => typeof code === "string" && code.trim()).map((code) => code.trim());
    if (subjectCodes.length === 0) {
      throw new Error("No donor subject codes available.");
    }

    const pick = (index: number) => subjectCodes[index] || subjectCodes[0];
    return {
      donorInstituteCode,
      base: pick(0),
      unentitled: pick(1),
      quota: pick(2),
      blocked: pick(3),
      paused: pick(4),
    };
  } catch {
    return {
      donorInstituteCode,
      base: "CLS7-MATH",
      unentitled: "CLS7-MATH",
      quota: "CLS7-MATH",
      blocked: "CLS7-MATH",
      paused: "CLS7-MATH",
    };
  }
}

export function resetAndSeedDemoSharedLibraryWorkflow(targetInstituteCode?: string) {
  const resolvedInstituteCode = resolveTargetInstituteCode(targetInstituteCode);
  const subjectCodes = resolveSeedSubjectCodes();
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
