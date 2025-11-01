import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { notFound } from "remix-utils";
import { db } from "~/utils/db.server";
import { storage } from "~/utils/s3-storage.server";
import envServer from "~/utils/env.server";

/**
 * Matrix Media Download Endpoint
 * Implements: https://spec.matrix.org/latest/client-server-api/#get_matrixmediav3downloadservernamemediaid
 *
 * This endpoint allows Matrix homeservers to download media from this Gifable instance.
 * The media ID is the Gifable media UUID, and it's embedded in the MXC URI as:
 * mxc://<server-name>/<media-id>
 *
 * Supports two modes:
 * - Redirect mode (allow_redirect=true): Returns 308 redirect to S3 URL
 * - Proxy mode (allow_redirect=false): Streams content through the server
 */
export async function loader({ request, params }: LoaderArgs) {
  const { serverName, mediaId } = params;

  // Validate server name matches our instance
  const appUrl = envServer.appUrl;
  const expectedServerName = new URL(appUrl).hostname;

  if (serverName !== expectedServerName) {
    return json(
      {
        errcode: "M_NOT_FOUND",
        error: `This server (${expectedServerName}) does not serve media for ${serverName}`,
      },
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Validate mediaId is provided
  if (!mediaId) {
    return json(
      {
        errcode: "M_NOT_FOUND",
        error: "Media ID is required",
      },
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Look up the media
  const media = await db.media.findUnique({
    where: { id: mediaId },
  });

  if (!media) {
    return json(
      {
        errcode: "M_NOT_FOUND",
        error: "Media not found",
      },
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Matrix federation should only serve public media
  // Private media should not be accessible via federation
  if (!media.isPublic) {
    return json(
      {
        errcode: "M_NOT_FOUND",
        error: "Media not found",
      },
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Check if client supports redirects
  const url = new URL(request.url);
  const allowRedirect = url.searchParams.get("allow_redirect") !== "false";

  // Get the S3 storage client
  const s3 = storage();
  const filename = s3.getFilenameFromURL(media.url);

  if (!filename) {
    return json(
      {
        errcode: "M_UNKNOWN",
        error: "Invalid media URL",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Determine content type from URL
  const ext = filename.split('.').pop()?.toLowerCase();
  const contentType = ext === 'gif' ? 'image/gif' :
                     ext === 'png' ? 'image/png' :
                     ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                     'application/octet-stream';

  // If redirect is allowed, return 308 redirect to S3 URL
  if (allowRedirect) {
    return new Response(null, {
      status: 308,
      headers: {
        "Location": media.url,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  // Otherwise, proxy the content through our server
  const minioClient = (s3 as any).minioClient;
  const bucket = (s3 as any).bucket;
  const filePath = s3.makeFilePath(filename);

  try {
    const stream = await minioClient.getObject(bucket, filePath);

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
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error fetching from S3:", error);
    return json(
      {
        errcode: "M_UNKNOWN",
        error: "Failed to fetch media",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
