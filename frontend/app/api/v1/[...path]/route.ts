import { NextRequest, NextResponse } from "next/server"

const API_ORIGIN = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000"

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const target = new URL(`/api/v1/${path.join("/")}`, API_ORIGIN)
  target.search = request.nextUrl.search

  const headers = new Headers()
  for (const name of ["accept", "authorization", "content-type", "cookie"]) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    redirect: "manual",
    cache: "no-store",
  })

  const responseHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    const name = key.toLowerCase()
    if (name === "set-cookie" || name === "content-encoding" || name === "content-length" || name === "transfer-encoding") {
      return
    }
    responseHeaders.set(key, value)
  })

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
  for (const cookie of upstream.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie)
  }
  return response
}

export const dynamic = "force-dynamic"

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
