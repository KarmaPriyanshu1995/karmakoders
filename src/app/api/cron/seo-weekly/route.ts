import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/seo/cronAuth";
import { runWeeklyReportsForActiveTenants } from "@/lib/seo/weeklyReports";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handleCron(req: Request) {
  if (!authorizeCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runWeeklyReportsForActiveTenants();
    return NextResponse.json({
      success: true,
      ran: results.filter((r) => r.status === "ran").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    });
  } catch (error) {
    console.error("[SEO weekly cron]", error);
    return NextResponse.json({ error: "Weekly report cron failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
