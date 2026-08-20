import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const adminDir = resolve(scriptDir, "..");
const repoRoot = resolve(adminDir, "../..");
const adminDist = join(adminDir, "dist");



const modules = [
  { id: "club", path: join(repoRoot, "apps/club"), base: "/club/" },
  { id: "coach", path: join(repoRoot, "apps/coach"), base: "/coach/" },
  { id: "academy", path: join(repoRoot, "apps/academy"), base: "/academy/" },
  { id: "cup", path: join(repoRoot, "apps/cup"), base: "/cup/" },
  { id: "connect", path: join(repoRoot, "apps/connect"), base: "/connect/" },
];

function runVite(appDir, outDir, base) {
  console.log(`\nBuilding ${relative(repoRoot, appDir)} -> ${relative(repoRoot, outDir)} (${base})`);

  const viteCommand =
    process.platform === "win32"
      ? join(repoRoot, "node_modules", ".bin", "vite.cmd")
      : join(repoRoot, "node_modules", ".bin", "vite");

  const result = spawnSync(
    viteCommand,
    [
      "build",
      "--base",
      base,
      "--outDir",
      outDir,
      "--emptyOutDir"
    ],
    {
      cwd: appDir,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "production"
      },
      shell: process.platform === "win32"
    }
  );

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function filesEqual(a, b) {
  if (!existsSync(a) || !existsSync(b)) return false;

  const left = readFileSync(a);
  const right = readFileSync(b);

  return left.length === right.length && left.equals(right);
}

function copyPublicToAdminRoot(sourceDir, destinationDir) {
  if (!existsSync(sourceDir)) return;

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const source = join(sourceDir, entry.name);
    const destination = join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      mkdirSync(destination, { recursive: true });
      copyPublicToAdminRoot(source, destination);
      continue;
    }

    if (existsSync(destination)) {
      if (filesEqual(source, destination)) continue;

      // Module-specific favicons/manifests can remain inside their module
      // build folder. Do not overwrite a different root-level file.
      console.warn(
        `Skipping conflicting root public asset: ${relative(repoRoot, source)}`
      );
      continue;
    }

    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination);
  }
}

console.log("\n=== Spraoi Admin production build ===");

// Build the lightweight Admin shell at /
rmSync(adminDist, { recursive: true, force: true });
runVite(adminDir, adminDist, "/");

// Build each admin-facing module under the same Admin domain.
for (const module of modules) {
  const moduleDist = join(module.path, "dist");

  runVite(module.path, moduleDist, module.base);

  const target = join(adminDist, module.id);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });

  cpSync(moduleDist, target, { recursive: true });

  // Some existing module JSX uses absolute public asset URLs such as
  // /spraoi-icon.png. Keep those available at the Admin root as well.
  copyPublicToAdminRoot(join(module.path, "public"), adminDist);
}

console.log("\nAdmin production output created:");
console.log("  /          -> Admin router");
console.log("  /club/     -> Spraoi Club");
console.log("  /coach/    -> Spraoi Coach");
console.log("  /academy/  -> Spraoi Academy Admin");
console.log("  /cup/      -> Spraoi Cup Admin");
console.log("  /connect/  -> Spraoi Connect");