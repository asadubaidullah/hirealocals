import { NextRequest, NextResponse } from "next/server";
import { serverApiUrl } from "@/lib/site";

export interface CreateCaseRequestBody {
  name: string;
  email: string;
  booking_reference?: string | null;
  category?: string;
  subject?: string;
  description: string;
  conversation_summary?: string | null;
  retell_chat_id?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<CreateCaseRequestBody>;

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const description = body.description?.trim();

    if (!name || name.length < 2) {
      return NextResponse.json(
        { success: false, error: "Please provide your name (at least 2 characters)." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!description || description.length < 5) {
      return NextResponse.json(
        { success: false, error: "Please provide a brief description of the issue." },
        { status: 400 }
      );
    }

    // Forward to backend API server
    const backendRes = await fetch(`${serverApiUrl}/api/support/cases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "HireALocals-Frontend/SupportCaseProxy",
      },
      body: JSON.stringify({
        name,
        email,
        booking_reference: body.booking_reference?.trim() || null,
        category: body.category?.trim() || "general",
        subject: body.subject?.trim() || "Support Case",
        description,
        conversation_summary: body.conversation_summary?.trim() || null,
        retell_chat_id: body.retell_chat_id?.trim() || null,
      }),
    });

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}));
      const errorMsg =
        typeof errData.detail === "string"
          ? errData.detail
          : "Unable to create support case right now. Please try again or use our contact form.";
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: backendRes.status >= 500 ? 502 : backendRes.status }
      );
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
  } catch (err: unknown) {
    console.error("[SupportCasesAPI] Error creating support case:", err);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred. Please use our Contact page.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const reference = req.nextUrl.searchParams.get("reference")?.trim();
    if (!reference) {
      return NextResponse.json({ success: false, error: "Reference is required" }, { status: 400 });
    }

    const backendRes = await fetch(`${serverApiUrl}/api/support/cases/${encodeURIComponent(reference)}`, {
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
    console.error("[SupportCasesAPI] Error getting support case:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch support case status" }, { status: 500 });
  }
}
