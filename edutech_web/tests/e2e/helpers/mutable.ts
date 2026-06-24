export function isRealDataModeEnabled() {
  return (
    process.env.PLAYWRIGHT_REAL_DATA_MODE === "1" ||
    process.env.PLAYWRIGHT_ENABLE_ALL_MUTABLE_ACTIONS === "1"
  );
}

export function isMutableLaneEnabled(flagName: string) {
  return isRealDataModeEnabled() || process.env[flagName] === "1";
}

export function mutableLaneMessage(flagName: string, description: string) {
  return `Enable ${flagName}=1 or PLAYWRIGHT_REAL_DATA_MODE=1 to run ${description}.`;
}
