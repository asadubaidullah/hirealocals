import { NextRequest, NextResponse } from "next/server";
import { serverApiUrl } from "@/lib/site";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await context.params;
    if (!reference || !reference.trim()) {
      return NextResponse.json({ success: false, error: "Reference is required" }, { status: 400 });
    }

    const trimmed = reference.trim();
    const backendRes = await fetch(`${serverApiUrl}/api/support/cases/${encodeURIComponent(trimmed)}`, {
      headers: {
        "User-Agent": "HireALocals-Frontend/SupportCaseProxy",
      },
    });

    if (!backendRes.ok) {
      return NextResponse.json({ success: false, error: "Case not found" }, { status: backendRes.status });
    }

    const data = await backendRes.json();
    return NextResponse.json({
      success: true,
      reference: data.reference,
      status: data.status || "open",
      assigned_name: data.assigned_name || null,
      assigned_avatar: data.assigned_avatar || null,
      assigned_role: data.assigned_role || "HireALocals Support",
    });
  } catch (err) {
    console.error("[SupportCasesAPI] Error getting support case by param:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch support case status" }, { status: 500 });
  }
}
