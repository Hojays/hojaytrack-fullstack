import { type NextRequest, NextResponse } from "next/server"

const FLASK_BASE = process.env.FLASK_BASE || "http://localhost:5050"

type Params = Promise<{ path: string[] }>

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { path } = await params
  return proxy(req, path)
}
export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { path } = await params
  return proxy(req, path)
}
export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const { path } = await params
  return proxy(req, path)
}
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { path } = await params
  return proxy(req, path)
}
export async function OPTIONS(req: NextRequest, { params }: { params: Params }) {
  const { path } = await params
  return proxy(req, path)
}

async function proxy(req: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/")
  const url = new URL(req.url)
  const targetUrl = `${FLASK_BASE}/${path}${url.search}`

  const incomingCookie = req.headers.get("cookie") || ""

  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") || "application/json",
  }
  if (incomingCookie) headers["cookie"] = incomingCookie

  let body: BodyInit | undefined
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text()
  }

  const flaskRes = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
  })

  const responseBody = await flaskRes.arrayBuffer()

  const res = new NextResponse(responseBody, {
    status: flaskRes.status,
    statusText: flaskRes.statusText,
  })

  // Forward ALL response headers from Flask back to the browser,
  // especially Set-Cookie so the session is stored correctly.
  flaskRes.headers.forEach((value, key) => {
    if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
      res.headers.append(key, value)
    }
  })

  return res
}
