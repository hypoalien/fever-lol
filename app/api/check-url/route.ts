import { isOrgUrlAvailable } from "@/lib/data/users";
import { requireUser } from "@/lib/session";
import { log } from "@/lib/log";

export async function GET(req: Request) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const orgUrl = new URL(req.url).searchParams.get("orgUrl");
  if (!orgUrl) {
    return Response.json(
      { error: "An organization URL is required" },
      { status: 400 }
    );
  }

  try {
    // Available also covers "already yours", so re-saving your own profile
    // does not report a clash.
    return Response.json({
      available: await isOrgUrlAvailable(orgUrl, session.user.id),
    });
  } catch (error) {
    log.exception("Error checking URL availability", error, { route: "api/check-url" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
