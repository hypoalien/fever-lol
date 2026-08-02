import { invalidRequest } from "@/lib/api";
import {
  ProfileError,
  ProfileInputSchema,
  getProfile,
  updateProfile,
} from "@/lib/data/users";
import { requireUser } from "@/lib/session";
import { log } from "@/lib/log";

/**
 * Onboarding writes the same fields as the profile endpoint, but additionally
 * marks the account as onboarded so the post-sign-in redirect stops firing.
 */
export async function GET() {
  const session = await requireUser();
  if (!session.ok) return session.response;

  try {
    const profile = await getProfile(session.user.id);
    if (!profile) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    // Previously this returned the entire user document.
    return Response.json(profile);
  } catch (error) {
    log.exception("Error fetching onboarding profile", error, { route: "api/onboarding" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const parsed = ProfileInputSchema.safeParse(await req.json());
  if (!parsed.success) return invalidRequest(parsed.error, "Invalid profile");

  try {
    const profile = await updateProfile(session.user.id, parsed.data, {
      markOnboarded: true,
    });
    return Response.json({ message: "Profile updated successfully", profile });
  } catch (error) {
    if (error instanceof ProfileError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    log.exception("Error completing onboarding", error, { route: "api/onboarding" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
