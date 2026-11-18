const fs = require("fs");
const path = require("path");

const { withDangerousMod } = require("@expo/config-plugins");

const DEBUG_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <application
        android:networkSecurityConfig="@xml/debug_network_security_config"
        tools:ignore="GoogleAppIndexingWarning" />
</manifest>
`;

const DEBUG_NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">10.0.2.2</domain>
    </domain-config>
</network-security-config>
`;

function addDebugMetroSupport(source) {
  if (source.includes("useDevSupport = BuildConfig.DEBUG")) {
    return source;
  }

  const factoryStart = source.indexOf("ExpoReactHostFactory.getDefaultReactHost(");
  const packageListStart = source.indexOf("PackageList(this).packages.apply", factoryStart);
  const openingBrace = source.indexOf("{", packageListStart);
  if (factoryStart < 0 || packageListStart < 0 || openingBrace < 0) {
    throw new Error("Could not locate the Expo React host package list in MainApplication.kt");
  }

  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      return `${source.slice(0, index + 1)},\n      useDevSupport = BuildConfig.DEBUG${source.slice(index + 1)}`;
    }
  }

  throw new Error("Could not find the end of the Expo React host package list in MainApplication.kt");
}

function writeDebugPolicy(androidRoot, sourceSet) {
  const sourceRoot = path.join(androidRoot, "app", "src", sourceSet);
  const resourceRoot = path.join(sourceRoot, "res", "xml");
  fs.mkdirSync(resourceRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "AndroidManifest.xml"), DEBUG_MANIFEST);
  fs.writeFileSync(
    path.join(resourceRoot, "debug_network_security_config.xml"),
    DEBUG_NETWORK_SECURITY_CONFIG,
  );
}

module.exports = function withAndroidDebugNetworkSecurity(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      writeDebugPolicy(androidRoot, "debug");
      writeDebugPolicy(androidRoot, "debugOptimized");

      const packagePath = (modConfig.android?.package || "").replaceAll(".", path.sep);
      const applicationPath = path.join(
        androidRoot,
        "app",
        "src",
        "main",
        "java",
        packagePath,
        "MainApplication.kt",
      );
      const applicationSource = fs.readFileSync(applicationPath, "utf8");
      fs.writeFileSync(applicationPath, addDebugMetroSupport(applicationSource));
      return modConfig;
    },
  ]);
};
