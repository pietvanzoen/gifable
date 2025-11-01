import type { LoaderArgs } from "@remix-run/node";
import { notFound, forbidden } from "remix-utils";
import { db } from "~/utils/db.server";
import { storage } from "~/utils/s3-storage.server";
import { getUser } from "~/utils/session.server";

export async function loader({ request, params }: LoaderArgs) {
  const media = await db.media.findUnique({
    where: { id: params.mediaId },
  });

  if (!media) {
    throw notFound({ message: "Media not found" });
  }

  // Check authorization: must be public OR user owns it OR user is admin
  const user = await getUser(request);
  const isOwner = user && media.userId === user.id;
  const isAdmin = user && user.isAdmin;

  if (!media.isPublic && !isOwner && !isAdmin) {
    throw forbidden({ message: "This media is private" });
  }

  // If no thumbnail, use original image
  const thumbnailUrl = media.thumbnailUrl || media.url;

  // Get the filename from the URL
  const s3 = storage();
  const filename = s3.getFilenameFromURL(thumbnailUrl);

  if (!filename) {
    throw new Error("Invalid media URL");
  }

  // Get the object from S3
  const minioClient = (s3 as any).minioClient;
  const bucket = (s3 as any).bucket;
  const filePath = s3.makeFilePath(filename);

  try {
    const stream = await minioClient.getObject(bucket, filePath);

    // Thumbnails are always JPEG
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = ext === 'gif' ? 'image/gif' :
                       ext === 'png' ? 'image/png' :
                       'image/jpeg';

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error fetching thumbnail from S3:", error);
    throw new Error("Failed to fetch thumbnail");
  }
}
