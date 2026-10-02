import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";

export const dynamic = "force-dynamic";

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

function runSchedulerOnce(): Promise<{ ok: boolean; output: string }> {
  const engineCwd = path.join(process.cwd(), "..", "engine");
  return new Promise((resolve) => {
    const child = spawn(
      process.env.PYTHON_PATH || "python",
      ["scheduler.py", "--once"],
      { cwd: engineCwd, env: process.env }
    );
    let output = "";
    child.stdout.on("data", (c) => {
      output += String(c);
    });
    child.stderr.on("data", (c) => {
      output += String(c);
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, output });
    });
    child.on("error", (err) => {
      resolve({ ok: false, output: String(err) });
    });
  });
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret") || "";

  if (!secret) {
    return noStore({ error: "CRON_SECRET is not configured." }, 503);
  }
  if (bearer !== secret && querySecret !== secret) {
    return noStore({ error: "Unauthorized." }, 401);
  }

  const result = await runSchedulerOnce();
  if (!result.ok) {
    return noStore({ error: "Scheduler tick failed.", detail: result.output.slice(0, 500) }, 500);
  }
  return noStore({ ok: true, detail: result.output.slice(0, 500) });
}
