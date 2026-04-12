/**
 * Catch-all proxy to the Railway API.
 *
 * All client-side fetch calls go to /api/<path> (same Vercel origin), so the
 * session cookie is scoped to vercel.app — no cross-site cookie restrictions.
 * This proxy forwards the request verbatim and streams the response back,
 * including Set-Cookie headers so OAuth callbacks work correctly.
 *
 * Required env var (server-side only):
 *   API_URL=https://panopticon-production-2b7b.up.railway.app
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPSTREAM = process.env.API_URL ?? "http://localhost:3001";

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const { search } = new URL(req.url);
  const target = `${UPSTREAM}/${path.join("/")}${search}`;

  // Forward all headers except host (must reflect upstream's own host)
  const headers = new Headers();
  for (const [key, value] of req.headers) {
    if (key.toLowerCase() === "host") continue;
    headers.set(key, value);
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  // Read body into a buffer so we don't need the non-standard `duplex: half`
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstreamRes = await fetch(target, {
    method: req.method,
    headers,
    body,
    redirect: "manual", // let the browser follow redirects (e.g. OAuth callback)
  });

  const resHeaders = new Headers();
  for (const [key, value] of upstreamRes.headers) {
    // Next.js / Vercel manages these itself
    if (["transfer-encoding", "connection"].includes(key.toLowerCase()))
      continue;
    resHeaders.append(key, value);
  }

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: resHeaders,
  });
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
