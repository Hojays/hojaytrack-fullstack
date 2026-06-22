module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/app/api/[...path]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DELETE",
    ()=>DELETE,
    "GET",
    ()=>GET,
    "OPTIONS",
    ()=>OPTIONS,
    "POST",
    ()=>POST,
    "PUT",
    ()=>PUT
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$6_$40$babel$2b$core$40$7$2e$2_40a7effce8bcad24669d45809ebe449e$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.2.6_@babel+core@7.2_40a7effce8bcad24669d45809ebe449e/node_modules/next/server.js [app-route] (ecmascript)");
;
const FLASK_BASE = process.env.FLASK_BASE || "http://localhost:5050";
async function GET(req, { params }) {
    const { path } = await params;
    return proxy(req, path);
}
async function POST(req, { params }) {
    const { path } = await params;
    return proxy(req, path);
}
async function PUT(req, { params }) {
    const { path } = await params;
    return proxy(req, path);
}
async function DELETE(req, { params }) {
    const { path } = await params;
    return proxy(req, path);
}
async function OPTIONS(req, { params }) {
    const { path } = await params;
    return proxy(req, path);
}
async function proxy(req, pathSegments) {
    const path = pathSegments.join("/");
    const url = new URL(req.url);
    const targetUrl = `${FLASK_BASE}/${path}${url.search}`;
    const incomingCookie = req.headers.get("cookie") || "";
    const headers = {
        "Content-Type": req.headers.get("content-type") || "application/json"
    };
    if (incomingCookie) headers["cookie"] = incomingCookie;
    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
        body = await req.text();
    }
    const flaskRes = await fetch(targetUrl, {
        method: req.method,
        headers,
        body
    });
    const responseBody = await flaskRes.arrayBuffer();
    const res = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$6_$40$babel$2b$core$40$7$2e$2_40a7effce8bcad24669d45809ebe449e$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](responseBody, {
        status: flaskRes.status,
        statusText: flaskRes.statusText
    });
    // Forward ALL response headers from Flask back to the browser,
    // especially Set-Cookie so the session is stored correctly.
    flaskRes.headers.forEach((value, key)=>{
        if (![
            "transfer-encoding",
            "connection"
        ].includes(key.toLowerCase())) {
            res.headers.append(key, value);
        }
    });
    return res;
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0v_v02_._.js.map