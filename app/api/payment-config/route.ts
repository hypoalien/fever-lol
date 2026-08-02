import { invalidRequest } from "@/lib/api";
import {
  PaymentConfigSchema,
  getMaskedPaymentConfig,
  savePaymentConfig,
} from "@/lib/data/payment-config";
import { requireUser } from "@/lib/session";
import { log } from "@/lib/log";

export async function GET() {
  const session = await requireUser();
  if (!session.ok) return session.response;

  try {
    return Response.json((await getMaskedPaymentConfig(session.user.id)) ?? {});
  } catch (error) {
    log.exception("Error fetching payment configuration", error, { route: "api/payment-config" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const parsed = PaymentConfigSchema.safeParse(await req.json());
  if (!parsed.success) {
    return invalidRequest(parsed.error, "Invalid payment configuration");
  }

  try {
    await savePaymentConfig(session.user.id, parsed.data);
    return Response.json({ message: "Payment configuration updated" });
  } catch (error) {
    log.exception("Error updating payment configuration", error, { route: "api/payment-config" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
