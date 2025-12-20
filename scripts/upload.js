import { spawn } from "child_process";
import * as dotenv from "dotenv";
import { existsSync } from "fs";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['KINTONE_BASE_URL', 'KINTONE_USERNAME', 'KINTONE_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Error: Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('\nPlease set these variables in your .env file or environment.');
  process.exit(1);
}

const app = process.env.APP_NAME || 'app1';
const isWatch = process.argv.includes("watch");

const args = [
  "--base-url", process.env.KINTONE_BASE_URL,
  "--username", process.env.KINTONE_USERNAME,
  "--password", process.env.KINTONE_PASSWORD,
];

if (isWatch) {
  args.push("--watch");
}

const manifestPath = `apps/${app}/customize-manifest.json`;

// Check if customize-manifest.json exists
if (!existsSync(manifestPath)) {
  console.error(`Error: customize-manifest.json not found at ${manifestPath}`);
  console.error(`Please create the manifest file for app: ${app}`);
  process.exit(1);
}

args.push(manifestPath);

const child = spawn("kintone-customize-uploader", args, {
  stdio: "inherit"
});

child.on("exit", (code) => {
  if (code !== 0) {
    console.error("Upload failed with code:", code);
    process.exit(code ?? 1);
  }
});
