import { spawn } from "child_process";
import * as dotenv from "dotenv";

dotenv.config();

const isWatch = process.argv.includes("watch");

const args = [
  "--base-url", process.env.KINTONE_BASE_URL,
  "--username", process.env.KINTONE_USERNAME,
  "--password", process.env.KINTONE_PASSWORD,
];

if (isWatch) {
  args.push("--watch");
}

args.push("customize-manifest.json");

const child = spawn("kintone-customize-uploader", args, {
  stdio: "inherit"
});

child.on("exit", (code) => {
  if (code !== 0) {
    console.error("Upload failed with code:", code);
    process.exit(code ?? 1);
  }
});
