import crypto from "crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

import { invalidRequest } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { log } from "@/lib/log";

/**
 * Presigned URL for an event flyer upload.
 *
 * Points at Cloudflare R2 rather than Amazon S3 — R2 speaks the same API, so
 * the presigning flow is unchanged and only the endpoint, region and
 * credentials differ. This is the last AWS dependency gone.
 *
 * The object key is generated here rather than taken from the request. The
 * previous version interpolated the client's `fileName` straight into the key,
 * so a caller could traverse the prefix or simply overwrite another
 * organizer's flyer by naming theirs.
 */

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const BodySchema = z.object({
  params: z.object({
    fileType: z.string().refine((type) => type in ALLOWED_TYPES, {
      message: "Only JPEG, PNG, WebP and AVIF images are accepted",
    }),
  }),
});

let client: S3Client | null = null;

function r2(): S3Client {
  client ??= new S3Client({
    // R2 has no regions; "auto" is what it expects.
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
  return client;
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_URL;
  if (!bucket || !publicBase || !process.env.R2_ACCESS_KEY_ID) {
    return Response.json(
      { error: "File uploads are not configured" },
      { status: 503 }
    );
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return invalidRequest(parsed.error);

  // Namespaced by user, with a random name — no client input reaches the key.
  const extension = ALLOWED_TYPES[parsed.data.params.fileType];
  const key = `flyer/${session.user.id}/${crypto.randomUUID()}.${extension}`;

  try {
    const signedUrl = await getSignedUrl(
      r2(),
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: parsed.data.params.fileType,
      }),
      { expiresIn: 60 }
    );

    return Response.json({
      signedRequest: signedUrl,
      // The bucket's public hostname — either its r2.dev address or a custom
      // domain. Kept in an env var so the bucket can move without a deploy.
      url: `${publicBase.replace(/\/$/, "")}/${key}`,
    });
  } catch (error) {
    log.exception("Could not sign flyer upload", error, { route: "api/events/get-flyer-upload-url" });
    return Response.json({ error: "Could not start upload" }, { status: 500 });
  }
}
