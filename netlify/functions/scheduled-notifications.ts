import { runCronJobAction } from "../../lib/actions/cron";

export default async function handler(req: Request) {
  const body = await req.json().catch(() => ({}));
  console.log("Scheduled function triggered. Next run:", body.next_run);

  try {
    const result = await runCronJobAction();
    console.log("Cron job completed:", result);
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const config = {
  schedule: "*/15 * * * *",
};
