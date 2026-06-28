import { execFileSync } from "node:child_process";
import path from "node:path";

const backendRoot = path.resolve(process.cwd(), "../edutech_backend");
const pythonExecutable = path.join(backendRoot, ".venv", "bin", "python");
const managePyPath = path.join(backendRoot, "manage.py");

function runManagePyCommand(args: string[]) {
  execFileSync(pythonExecutable, [managePyPath, ...args], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: process.env,
  });
}

export function resetAndSeedDemoSharedLibraryWorkflow(targetInstituteCode = "DLI001") {
  runManagePyCommand([
    "reset_demo_shared_library_workflow",
    "--target-institute-code",
    targetInstituteCode,
  ]);
  runManagePyCommand([
    "seed_demo_shared_library_access",
    "--target-institute-code",
    targetInstituteCode,
  ]);
}
