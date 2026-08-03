import { getDashboardData } from "@/lib/data/analytics";
import { requireUser } from "@/lib/session";
import { DEFAULT_CURRENCY } from "@/lib/currency";

export async function GET() {
  const session = await requireUser();
  if (!session.ok) return session.response;

  try {
    const data = await getDashboardData(
      session.user.id,
      session.user.currency ?? DEFAULT_CURRENCY
    );
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
