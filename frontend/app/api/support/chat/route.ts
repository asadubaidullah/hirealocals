import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ChatRequestBody {
  message?: string;
  chatId?: string | null;
  action?: "message" | "close";
  history?: Array<{ sender: "bot" | "user"; text: string }>;
  context?: {
    pathname?: string;
    pageTitle?: string;
    userRole?: string;
  };
}

interface ChatResponseBody {
  success: boolean;
  reply?: string;
  chatId?: string | null;
  actionLink?: {
    label: string;
    href: string;
  };
  isEscalation?: boolean;
  escalationCategory?: "payment" | "booking" | "human" | "general";
  error?: string;
}

// Allowed safe internal destination paths for links extracted from Retell markdown output
const ALLOWED_INTERNAL_PREFIXES = [
  "/become-a-local",
  "/how-it-works",
  "/safety",
  "/cancellation",
  "/terms",
  "/privacy",
  "/refund",
  "/register",
  "/destinations",
  "/experiences",
  "/uk/london",
  "/usa/new-york",
  "/dashboard",
  "/contact",
  "/request-a-local",
];

function sanitizeAndExtractMarkdownLink(
  text: string
): { cleanText: string; extractedLink?: { label: string; href: string } } {
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g;
  let extractedLink: { label: string; href: string } | undefined;

  const cleanText = text.replace(mdLinkRegex, (match, label, href) => {
    try {
      let pathname = href;
      if (href.startsWith("http://") || href.startsWith("https://")) {
        const parsed = new URL(href);
        if (
          parsed.hostname === "hirealocals.com" ||
          parsed.hostname.endsWith(".hirealocals.com") ||
          parsed.hostname === "localhost"
        ) {
          pathname = parsed.pathname;
        } else {
          return label;
        }
      }

      const isAllowed = ALLOWED_INTERNAL_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      );

      if (isAllowed && !extractedLink) {
        extractedLink = {
          label: `${label.trim()} →`,
          href: pathname,
        };
      }
    } catch {
      // Invalid URL syntax
    }
    return label;
  });

  return { cleanText: cleanText.trim(), extractedLink };
}

export async function POST(req: Request) {
  try {
    let body: ChatRequestBody = {};
    let rawText = "";
    try {
      rawText = await req.text();
      if (rawText && rawText.trim()) {
        body = JSON.parse(rawText) as ChatRequestBody;
      }
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      return NextResponse.json<ChatResponseBody>(
        {
          success: false,
          reply: "I'm having trouble reaching the HireALocals support service right now. Please try again in a moment.",
          error: `Invalid request payload: ${msg}`,
        },
        { status: 400 }
      );
    }

    const retellApiKey = process.env.RETELL_API_KEY;
    const retellAgentId = process.env.RETELL_CHAT_AGENT_ID || process.env.RETELL_AGENT_ID;

    // Handle session end / close action
    if (body.action === "close") {
      if (retellApiKey && body.chatId && !body.chatId.startsWith("esc-")) {
        try {
          await fetch(`https://api.retellai.com/end-chat/${encodeURIComponent(body.chatId)}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${retellApiKey}`,
            },
          });
        } catch {
          // Non-blocking close
        }
      }
      return NextResponse.json({ success: true, closed: true });
    }

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json<ChatResponseBody>(
        {
          success: false,
          reply: "Please enter a message.",
          error: "Message is required",
        },
        { status: 400 }
      );
    }

    if (!retellApiKey || !retellAgentId) {
      console.warn(
        "[SupportChat] RETELL CONFIGURATION REQUIRED: RETELL_API_KEY or RETELL_CHAT_AGENT_ID/RETELL_AGENT_ID missing."
      );
      return NextResponse.json<ChatResponseBody>(
        {
          success: false,
          reply: "I'm having trouble reaching the HireALocals support service right now. Please try again in a moment.",
          error: "RETELL CONFIGURATION REQUIRED",
        },
        { status: 503 }
      );
    }

    let activeChatId = body.chatId;

    // If no active Retell chat session, initialize one via POST /create-chat
    if (!activeChatId || activeChatId.startsWith("esc-")) {
      const createChatRes = await fetch("https://api.retellai.com/create-chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${retellApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: retellAgentId,
          metadata: {
            pathname: body.context?.pathname || "/",
            pageTitle: body.context?.pageTitle || "HireALocals",
            userRole: body.context?.userRole || "guest",
          },
          retell_llm_dynamic_variables: {
            current_page: body.context?.pathname || "/",
            page_title: body.context?.pageTitle || "HireALocals",
            user_role: body.context?.userRole || "guest",
            platform_fee: "12%",
            payment_partner: "Safepay",
            support_guidelines:
              "HireALocals fee policy: 12% platform fee is added to the host's rate at checkout; payments are processed securely through Safepay. Unpaid bookings can be cancelled anytime via the booking dashboard. Paid bookings require support review so cancellation and Safepay refund eligibility stay synchronized. Verified host cancellation or no-show guarantees a 100% refund including platform fee. Never ask for credit card numbers, CVVs, passwords, or OTP codes.",
            escalation_rules:
              "Whenever an issue requires manual human review or account/payment intervention, append the exact machine-readable marker at the very end of your response: [[HAL_ESCALATE:payment]] for payment/card/Safepay charge discrepancies; [[HAL_ESCALATE:booking]] for booking disputes; [[HAL_ESCALATE:human]] for explicit requests to speak to a human or general manual support. For normal informational questions, do NOT append any marker.",
            verified_routes:
              "/become-a-local, /how-it-works, /safety, /cancellation, /register, /uk/london/things-to-do, /usa/new-york, /destinations, /experiences, /dashboard/bookings",
          },
        }),
      });

      if (!createChatRes.ok) {
        const errText = await createChatRes.text().catch(() => "");
        console.error(`[SupportChat] Retell /create-chat failed (${createChatRes.status}):`, errText);
        return NextResponse.json<ChatResponseBody>(
          {
            success: false,
            reply: "I'm having trouble reaching the HireALocals support service right now. Please try again in a moment.",
            error: "Retell session initialization failed",
          },
          { status: 502 }
        );
      }

      const createData = (await createChatRes.json()) as { chat_id?: string };
      if (!createData.chat_id) {
        console.error("[SupportChat] Retell /create-chat returned no chat_id:", createData);
        return NextResponse.json<ChatResponseBody>(
          {
            success: false,
            reply: "I'm having trouble reaching the HireALocals support service right now. Please try again in a moment.",
            error: "No chat_id in Retell create-chat response",
          },
          { status: 502 }
        );
      }

      activeChatId = createData.chat_id;
    }

    // Send user message directly to Retell via POST /create-chat-completion
    const completionRes = await fetch("https://api.retellai.com/create-chat-completion", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${retellApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: activeChatId,
        content: message,
      }),
    });

    if (!completionRes.ok) {
      const errText = await completionRes.text().catch(() => "");
      console.error(`[SupportChat] Retell /create-chat-completion failed (${completionRes.status}):`, errText);
      return NextResponse.json<ChatResponseBody>(
        {
          success: false,
          reply: "I'm having trouble reaching the HireALocals support service right now. Please try again in a moment.",
          error: "Retell completion request failed",
        },
        { status: 502 }
      );
    }

    const completionData = (await completionRes.json()) as {
      messages?: Array<{
        message_id?: string;
        role?: string;
        content?: string;
        created_timestamp?: number;
      }>;
    };

    // Extract agent message directly from Retell
    const agentMsg = (completionData.messages || [])
      .filter((m) => m.role === "agent")
      .pop();

    const rawReply = agentMsg?.content?.trim();
    if (!rawReply) {
      console.error("[SupportChat] Retell returned no agent content:", completionData);
      return NextResponse.json<ChatResponseBody>(
        {
          success: false,
          reply: "I'm having trouble reaching the HireALocals support service right now. Please try again in a moment.",
          error: "No agent response received from Retell",
        },
        { status: 502 }
      );
    }

    // Parse explicit machine-readable escalation marker from Retell
    // Retell appends [[HAL_ESCALATE:payment]], [[HAL_ESCALATE:booking]], or [[HAL_ESCALATE:human]]
    // when manual account/payment intervention or human support is required.
    const escalationMarkerRegex = /\[\[HAL_ESCALATE:(payment|booking|human)\]\]/i;
    const markerMatch = rawReply.match(escalationMarkerRegex);

    let isEscalation = false;
    let escalationCategory: "payment" | "booking" | "human" | "general" = "general";

    // Strip the exact marker from the reply before showing the customer
    const cleanRawReply = rawReply.replace(escalationMarkerRegex, "").trim();

    // Sanitize any Markdown links emitted by Retell
    const { cleanText: sanitizedReply, extractedLink } = sanitizeAndExtractMarkdownLink(cleanRawReply);
    let actionLink: { label: string; href: string } | undefined = extractedLink;

    if (markerMatch) {
      const category = markerMatch[1].toLowerCase() as "payment" | "booking" | "human";
      isEscalation = true;
      escalationCategory = category;
      actionLink = {
        label: "Create support case →",
        href: `#escalate-${category}`,
      };
    }

    // Note: NO local intent matching, NO query.includes(...) answering engine, NO canned FAQ engine.
    // Every informational answer comes directly from Retell AI.

    return NextResponse.json<ChatResponseBody>({
      success: true,
      reply: sanitizedReply,
      chatId: activeChatId,
      actionLink,
      isEscalation,
      escalationCategory,
    });
  } catch (err) {
    const errorDetails = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("[SupportChat] Uncaught error:", errorDetails);
    return NextResponse.json<ChatResponseBody>(
      {
        success: false,
        reply: "I'm having trouble reaching the HireALocals support service right now. Please try again in a moment.",
        error: errorDetails,
      },
      { status: 500 }
    );
  }
}
