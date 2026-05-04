#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const qrcode = require("qrcode-terminal");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.capture ? "pipe" : "inherit",
    shell: process.platform === "win32",
    encoding: "utf8",
    ...options,
  });
  return result;
}

function extractJson(text) {
  if (!text) return null;
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    const chunk = text.slice(start, end + 1);
    try {
      return JSON.parse(chunk);
    } catch {
      return null;
    }
  }
  return null;
}

function getBuildUrl(builds) {
  if (!Array.isArray(builds) || !builds.length) return null;
  const build = builds[0];
  return (
    build?.artifacts?.buildUrl ||
    build?.artifacts?.applicationArchiveUrl ||
    build?.buildUrl ||
    null
  );
}

function ensureLoggedIn() {
  const whoami = run("eas", ["whoami"], { capture: true });
  if (whoami.status === 0) {
    const account = (whoami.stdout || "").trim();
    console.log(`Authenticated with EAS as: ${account || "current account"}`);
    return;
  }

  console.log("No active EAS session. Running `eas login`...");
  const login = run("eas", ["login"]);
  if (login.status !== 0) {
    console.error("EAS login failed. Aborting build.");
    process.exit(login.status || 1);
  }
}

function main() {
  console.log("Starting Android preview build workflow...");
  ensureLoggedIn();

  console.log("Running: eas build -p android --profile preview --wait --json");
  const build = run(
    "eas",
    ["build", "-p", "android", "--profile", "preview", "--wait", "--json"],
    { capture: true },
  );

  if (build.stdout) process.stdout.write(build.stdout);
  if (build.stderr) process.stderr.write(build.stderr);

  if (build.status !== 0) {
    console.error("EAS build failed.");
    process.exit(build.status || 1);
  }

  const parsed = extractJson(build.stdout);
  const url = getBuildUrl(parsed);

  if (!url) {
    console.error("Build finished but install URL was not found in EAS output.");
    process.exit(1);
  }

  console.log("\nBuild successful.");
  console.log(`Install URL: ${url}`);
  console.log("\nScan this QR code to open/install the build:\n");
  qrcode.generate(url, { small: true });

  console.log("\nNext:");
  console.log("1. Scan QR from your phone camera.");
  console.log("2. Open link to install APK (or open with Expo tools if applicable).");
}

main();
