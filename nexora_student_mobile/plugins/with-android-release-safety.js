const { withAppBuildGradle } = require("@expo/config-plugins");

const RELEASE_SIGNING_MARKER = "EAS or Gradle-injected credentials must sign release artifacts.";
const RELEASE_DEBUG_SIGNING_PATTERN = /(release\s*\{[\s\S]*?)\n\s*signingConfig signingConfigs\.debug/;

function removeDebugReleaseSigning(source) {
  if (RELEASE_DEBUG_SIGNING_PATTERN.test(source)) {
    return source.replace(RELEASE_DEBUG_SIGNING_PATTERN, (_, releasePrefix) => {
      if (source.includes(RELEASE_SIGNING_MARKER)) return releasePrefix;
      return `${releasePrefix}\n            // ${RELEASE_SIGNING_MARKER}`;
    });
  }
  if (source.includes(RELEASE_SIGNING_MARKER)) return source;
  throw new Error("Could not remove debug signing from the Android release build type.");
}

module.exports = function withAndroidReleaseSafety(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== "groovy") {
      throw new Error("Android release safety requires a Groovy app build.gradle file.");
    }
    modConfig.modResults.contents = removeDebugReleaseSigning(modConfig.modResults.contents);
    return modConfig;
  });
};

module.exports.removeDebugReleaseSigning = removeDebugReleaseSigning;
