import { invalidRequest } from "@/lib/api";
import {
  ProfileError,
  ProfileInputSchema,
  getProfile,
  updateProfile,
} from "@/lib/data/users";
import { requireUser } from "@/lib/session";
import { log } from "@/lib/log";

export async function GET() {
  const session = await requireUser();
  if (!session.ok) return session.response;

  try {
    const profile = await getProfile(session.user.id);
    if (!profile) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json(profile);
  } catch (error) {
    log.exception("Error fetching profile", error, { route: "api/profile" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const parsed = ProfileInputSchema.safeParse(await req.json());
  if (!parsed.success) return invalidRequest(parsed.error, "Invalid profile");

  try {
    const profile = await updateProfile(session.user.id, parsed.data);
    return Response.json({ message: "Profile updated successfully", profile });
  } catch (error) {
    if (error instanceof ProfileError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    log.exception("Error updating profile", error, { route: "api/profile" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
