"use client";

import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Compass,
  CreditCard,
  Headphones,
  HelpCircle,
  Loader2,
  MessageCircle,
  Minus,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

export interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  time?: string;
  actionLink?: {
    label: string;
    href: string;
  };
  isEscalation?: boolean;
}

export interface ActiveCaseInfo {
  reference: string;
  status: string;
  assignedName?: string | null;
  assignedAvatar?: string | null;
  assignedRole?: string | null;
}

interface StarterChip {
  id: string;
  label: string;
  query: string;
  icon: typeof Compass;
}

const STARTER_CHIPS: StarterChip[] = [
  {
    id: "london",
    label: "Find an experience in London",
    query: "Find an experience in London",
    icon: Compass,
  },
  {
    id: "booking",
    label: "How does booking work?",
    query: "How does booking work?",
    icon: HelpCircle,
  },
  {
    id: "fees",
    label: "What are the fees?",
    query: "What are the fees?",
    icon: CreditCard,
  },
  {
    id: "local",
    label: "Become a Local",
    query: "Become a Local",
    icon: Sparkles,
  },
];

const INITIAL_GREETING: ChatMessage = {
  id: "greeting-1",
  sender: "bot",
  text: "Hi — I’m the HireALocals helper. How can I help you today?",
  time: "Just now",
};

type Point = {
  x: number;
  y: number;
};

type Dock = {
  right: number;
  bottom: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

interface EscalationState {
  isOpen: boolean;
  category: "payment" | "booking" | "human" | "general";
  title: string;
  descPrompt: string;
  name: string;
  email: string;
  bookingRef: string;
  description: string;
  isSubmitting: boolean;
  error: string | null;
}

export default function HelpChat() {
  const pathname = usePathname();

  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Helper panel open/closed state
  const [isOpen, setIsOpen] = useState(false);

  // Text composer input
  const [inputText, setInputText] = useState("");

  // Retell Chat Session ID
  const [chatId, setChatId] = useState<string | null>(null);

  // Active request / typing state
  const [isTyping, setIsTyping] = useState(false);

  // Chat conversation history
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);

  // Active created support case & assigned human support state
  const [activeCase, setActiveCase] = useState<ActiveCaseInfo | null>(null);

  // Docking and drag state
  const [manualPosition, setManualPosition] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dock, setDock] = useState<Dock>({ right: 20, bottom: 20 });

  // In-chat Support Case Escalation Form State
  const [escalation, setEscalation] = useState<EscalationState>({
    isOpen: false,
    category: "general",
    title: "Create Support Case",
    descPrompt: "Our team will review your request and reply via email.",
    name: "",
    email: "",
    bookingRef: "",
    description: "",
    isSubmitting: false,
    error: null,
  });

  const isLocalWorkspace = pathname.startsWith("/local-dashboard");

  // Determine if conversation has started (user has sent at least one message)
  const hasUserSentMessage = messages.some((m) => m.sender === "user");

  // Handle ESC key (minimizes to preserve conversation)
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // Auto scroll messages to bottom on new message, typing, or escalation form toggle
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen, escalation.isOpen]);

  function visibleLocalBottomNav() {
    if (typeof window === "undefined" || !isLocalWorkspace || window.innerWidth > 900) {
      return null;
    }
    const nav = document.querySelector(".pro-workspace-local .pro-mobile-nav") as HTMLElement | null;
    if (!nav) return null;
    const style = window.getComputedStyle(nav);
    const rect = nav.getBoundingClientRect();
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0 ||
      rect.height <= 0 ||
      rect.top >= window.innerHeight
    ) {
      return null;
    }
    return rect;
  }

  function calculateDock(): Dock {
    const bottomNavRect = visibleLocalBottomNav();
    if (!bottomNavRect) {
      return { right: 20, bottom: 20 };
    }
    const navHeight = Math.max(0, window.innerHeight - bottomNavRect.top);
    return {
      right: 16,
      bottom: Math.max(16, Math.round(navHeight + 12)),
    };
  }

  useEffect(() => {
    function updateDock() {
      setDock(calculateDock());
    }
    updateDock();
    window.addEventListener("resize", updateDock);
    window.addEventListener("scroll", updateDock, { passive: true });
    return () => {
      window.removeEventListener("resize", updateDock);
      window.removeEventListener("scroll", updateDock);
    };
  }, [isLocalWorkspace]);

  function clampManual(x: number, y: number): Point {
    const btnW = 150;
    const btnH = 48;
    const pad = 12;
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const bottomNavRect = visibleLocalBottomNav();
    const reservedBottom = bottomNavRect ? Math.max(0, maxH - bottomNavRect.top) : 0;

    return {
      x: Math.min(Math.max(pad, x), Math.max(pad, maxW - btnW - pad)),
      y: Math.min(Math.max(pad, y), Math.max(pad, maxH - btnH - pad - reservedBottom)),
    };
  }

  function startDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    const el = launcherRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    suppressClickRef.current = false;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {}
  }

  function moveDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) > 4) {
      drag.moved = true;
      setDragging(true);
    }
    if (!drag.moved) return;

    setManualPosition(clampManual(drag.originX + dx, drag.originY + dy));
  }

  function finishDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    suppressClickRef.current = drag.moved;
    try {
      launcherRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
    dragRef.current = null;
    setDragging(false);
  }

  function cancelDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }

  function openHelper() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setIsOpen(true);
  }

  // ---------------------------------------------------------------------------
  // MINIMIZE (—): Hides panel, PRESERVES session and conversation history
  // ---------------------------------------------------------------------------
  function handleMinimize() {
    setIsOpen(false);
  }

  // ---------------------------------------------------------------------------
  // CLOSE (×): Ends chat, CLEARS history and session, notifies server
  // ---------------------------------------------------------------------------
  async function handleClose() {
    const currentChatId = chatId;
    setIsOpen(false);
    setChatId(null);
    setActiveCase(null);
    setMessages([INITIAL_GREETING]);
    setInputText("");
    setIsTyping(false);
    setEscalation({
      isOpen: false,
      category: "general",
      title: "Create Support Case",
      descPrompt: "Our team will review your request and reply via email.",
      name: "",
      email: "",
      bookingRef: "",
      description: "",
      isSubmitting: false,
      error: null,
    });

    if (currentChatId) {
      try {
        await fetch("/api/support/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "close", chatId: currentChatId }),
        });
      } catch {
        // Non-blocking close
      }
    }
  }

  // ---------------------------------------------------------------------------
  // OPEN IN-CHAT ESCALATION FORM
  // ---------------------------------------------------------------------------
  function triggerEscalation(category: "payment" | "booking" | "human" | "general" = "general") {
    const savedName = typeof window !== "undefined" ? localStorage.getItem("hal_name") || "" : "";
    const savedEmail = typeof window !== "undefined" ? localStorage.getItem("hal_email") || "" : "";

    // Extract potential booking reference from prior user messages
    const allUserText = messages
      .filter((m) => m.sender === "user")
      .map((m) => m.text)
      .join(" ");
    const bookingMatch = allUserText.match(/#?([A-Za-z0-9_-]{4,16})/);
    const detectedBooking = bookingMatch ? bookingMatch[0].replace("#", "") : "";

    const lastUserMsg = [...messages].reverse().find((m) => m.sender === "user")?.text || "";

    let formTitle = "Create Support Case";
    let formDesc = "Our team will review your request and reply via email.";
    if (category === "payment") {
      formTitle = "Create Support Case";
      formDesc =
        "This needs secure account and payment verification. I can create a support case and pass the relevant conversation details to our support team so you won’t need to explain everything again.";
    } else if (category === "booking") {
      formTitle = "Create Support Case";
      formDesc =
        "I've taken this as far as I can without accessing private booking information. I can send this conversation securely to our support team for review.";
    } else if (category === "human") {
      formTitle = "Create Support Case";
      formDesc =
        "Of course. I can prepare this conversation for a HireALocals support specialist and include the relevant details so you don't have to start over.";
    }

    setEscalation({
      isOpen: true,
      category,
      title: formTitle,
      descPrompt: formDesc,
      name: savedName,
      email: savedEmail,
      bookingRef: detectedBooking,
      description: lastUserMsg,
      isSubmitting: false,
      error: null,
    });
  }

  // ---------------------------------------------------------------------------
  // SUBMIT IN-CHAT SUPPORT CASE
  // ---------------------------------------------------------------------------
  async function submitEscalationForm(e: React.FormEvent) {
    e.preventDefault();
    const name = escalation.name.trim();
    const email = escalation.email.trim();
    const description = escalation.description.trim();

    if (!name || name.length < 2) {
      setEscalation((prev) => ({ ...prev, error: "Please provide your name (at least 2 characters)." }));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setEscalation((prev) => ({ ...prev, error: "Please provide a valid email address." }));
      return;
    }

    if (!description || description.length < 5) {
      setEscalation((prev) => ({ ...prev, error: "Please enter a brief description of the issue." }));
      return;
    }

    setEscalation((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const summary = messages.map((m) => `${m.sender.toUpperCase()}: ${m.text}`).join("\n");

      const res = await fetch("/api/support/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          booking_reference: escalation.bookingRef.trim() || null,
          category: escalation.category,
          subject: `${escalation.title} (${name})`,
          description,
          conversation_summary: summary,
          retell_chat_id: chatId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to create support case at this moment.");
      }

      const caseRef = data.reference;
      setActiveCase({
        reference: caseRef,
        status: data.status || "open",
        assignedName: data.assigned_name || null,
        assignedAvatar: data.assigned_avatar || null,
        assignedRole: data.assigned_role || "HireALocals Support",
      });

      // Append verified confirmation bubble to conversation matching Section 13 exactly
      const confirmationMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        sender: "bot",
        text: `Your support case has been created successfully. Our support team can review the conversation without you having to repeat the issue.\n\nReference: ${caseRef}\n\nWe’ll use your provided contact details if further information is needed.`,
        time: "Just now",
        actionLink: escalation.bookingRef.trim()
          ? { label: "Manage Your Bookings →", href: "/dashboard/bookings" }
          : { label: "How HireALocals Works →", href: "/how-it-works" },
        isEscalation: false,
      };

      setMessages((prev) => [...prev, confirmationMsg]);
      setEscalation((prev) => ({ ...prev, isOpen: false, isSubmitting: false, error: null }));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unable to submit case.";
      setEscalation((prev) => ({ ...prev, isSubmitting: false, error: errMsg }));
      const failureMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        sender: "bot",
        text: "I couldn't create the support case automatically. Your conversation is still here. Please use our Contact page and include the details above.",
        time: "Just now",
        actionLink: { label: "Go to Contact Page →", href: "/contact" },
        isEscalation: false,
      };
      setMessages((prev) => [...prev, failureMsg]);
    }
  }

  // ---------------------------------------------------------------------------
  // DISPATCH USER QUERY TO SECURE SERVER-SIDE RETELL ROUTE
  // ---------------------------------------------------------------------------
  async function executeSendMessage(queryText: string) {
    const trimmed = queryText.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = {
      id: "usr-" + Date.now(),
      sender: "user",
      text: trimmed,
      time: "Just now",
    };

    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      const payload = {
        message: trimmed,
        chatId: chatId,
        history: updatedMessages.map((m) => ({ sender: m.sender, text: m.text })),
        context: {
          pathname,
          pageTitle: typeof document !== "undefined" ? document.title : "HireALocals",
          userRole: isLocalWorkspace ? "local" : "traveler",
        },
      };

      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("HTTP error " + res.status);
      }

      const data = await res.json();
      if (data.chatId && !chatId) {
        setChatId(data.chatId);
      }

      const botMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        sender: "bot",
        text: data.reply || "I’m here to help. Please feel free to ask anything about HireALocals!",
        time: "Just now",
        actionLink: data.actionLink,
        isEscalation: data.isEscalation,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Support chat error:", err);
      const errorMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        sender: "bot",
        text: "I'm having trouble reaching the HireALocals support service right now. Please try again in a moment.",
        time: "Just now",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }

  if (pathname.startsWith("/admin")) {
    return null;
  }

  if (
    pathname.startsWith("/local-dashboard/messages") ||
    pathname.startsWith("/traveler-dashboard/messages")
  ) {
    return null;
  }

  const launcherStyle = manualPosition
    ? {
        left: `${manualPosition.x}px`,
        top: `${manualPosition.y}px`,
        right: "auto",
        bottom: "auto",
      }
    : {
        left: "auto",
        top: "auto",
        right: `${dock.right}px`,
        bottom: `${dock.bottom}px`,
      };

  return (
    <>
      {/* 1. FLOATING LAUNCHER — UNMOUNTS/HIDES WHEN HELPER IS OPEN */}
      {!isOpen && (
        <button
          ref={launcherRef}
          type="button"
          className={[
            "help-launcher",
            "help-smart-launcher",
            manualPosition ? "is-manual" : "is-docked",
            dragging ? "is-dragging" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={launcherStyle}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={cancelDrag}
          onClick={openHelper}
          aria-label="Open Help and chat"
          title="Open Help & chat"
        >
          <MessageCircle size={19} className="help-launcher-icon" />
          <span>Help & chat</span>
        </button>
      )}

      {/* 2. HIREALOCALS HELPER PANEL (RETELL FRONTEND) — FLOATING WINDOW, NON-BLOCKING */}
      {isOpen && (
        <div
          className="help-panel help-helper-panel"
          role="region"
          aria-label="HireALocals Helper"
        >
          {/* WINDOW HEADER WITH MINIMIZE & CLOSE CONTROLS */}
          <header className="help-head">
            <div className="help-head-brand">
              <div className="help-avatar-wrap">
                <span className="help-avatar">
                  <Headphones size={17} />
                </span>
                <span className="help-status-dot" aria-label="Online" />
              </div>

              <div className="help-head-text">
                <strong>HireALocals Helper</strong>
                <small>24/7 Help Support</small>
              </div>
            </div>

            {/* TOP-RIGHT WINDOW CONTROLS */}
            <div className="help-head-actions">
              <button
                type="button"
                className="help-win-btn help-minimize-btn"
                onClick={handleMinimize}
                aria-label="Minimize chat"
                title="Minimize chat"
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                className="help-win-btn help-close-btn"
                onClick={handleClose}
                aria-label="Close chat"
                title="Close chat"
              >
                <X size={17} />
              </button>
            </div>
          </header>

            {/* CHATBOT BODY — CONVERSATION & STARTER CHIPS */}
            <div className="help-body">
              <div className="help-messages-list">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`help-bubble-row ${m.sender === "user" ? "is-user" : "is-bot"}`}
                  >
                    {m.sender === "bot" && (
                      <span className="help-bubble-avatar">
                        <Headphones size={13} />
                      </span>
                    )}
                    <div className={`help-bubble ${m.sender}`}>
                      <div className="help-bubble-content" style={{ whiteSpace: "pre-line" }}>
                        {m.text}
                      </div>

                      {/* CONTEXTUAL ACTION LINK / ESCALATION BUTTON */}
                      {m.actionLink && (
                        <div className="help-bubble-action-wrap">
                          {m.actionLink.href.startsWith("#escalate") ? (
                            <button
                              type="button"
                              className="help-bubble-action-link is-escalation"
                              onClick={() => {
                                const category = m.actionLink?.href.replace("#escalate-", "") as
                                  | "payment"
                                  | "booking"
                                  | "human"
                                  | "general";
                                triggerEscalation(category || "general");
                              }}
                            >
                              {m.actionLink.label}
                            </button>
                          ) : (
                            <a
                              href={m.actionLink.href}
                              className={`help-bubble-action-link ${m.isEscalation ? "is-escalation" : ""}`}
                            >
                              {m.actionLink.label}
                            </a>
                          )}
                        </div>
                      )}
                      {m.time && <span className="help-bubble-time">{m.time}</span>}
                    </div>
                  </div>
                ))}

                {/* ASSIGNED HUMAN SUPPORT / TEAM HANDOFF CARD */}
                {activeCase && (
                  <div className="help-assigned-card" role="status" aria-label="Support Case Assignment">
                    <div className="help-assigned-avatar-wrap">
                      {activeCase.assignedAvatar ? (
                        <img
                          src={activeCase.assignedAvatar}
                          alt={activeCase.assignedName || "HireALocals Support Team"}
                          className="help-assigned-avatar-img"
                        />
                      ) : activeCase.assignedName ? (
                        <span className="help-assigned-avatar-initial">
                          {activeCase.assignedName.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <span className="help-assigned-avatar-generic">
                          <Headphones size={18} />
                        </span>
                      )}
                    </div>
                    <div className="help-assigned-info">
                      <div className="help-assigned-title-row">
                        <strong className="help-assigned-name">
                          {activeCase.assignedName || "HireALocals Support Team"}
                        </strong>
                        <span className="help-assigned-ref">{activeCase.reference}</span>
                      </div>
                      <span className="help-assigned-role">
                        {activeCase.assignedName
                          ? activeCase.assignedRole || "HireALocals Support"
                          : "HireALocals Support Team"}
                      </span>
                      <p className="help-assigned-note">
                        {activeCase.assignedName
                          ? `${activeCase.assignedName} has been assigned to your case and will review your conversation details.`
                          : "Case received. Our support team will review your conversation details and follow up via email."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Subtle Typing Indicator */}
                {isTyping && (
                  <div className="help-bubble-row is-bot">
                    <span className="help-bubble-avatar">
                      <Headphones size={13} />
                    </span>
                    <div className="help-typing-indicator" aria-label="Assistant is typing">
                      <span className="help-typing-dot" />
                      <span className="help-typing-dot" />
                      <span className="help-typing-dot" />
                    </div>
                  </div>
                )}

                {/* IN-CHAT SUPPORT CASE ESCALATION CARD */}
                {escalation.isOpen && (
                  <div className="help-escalation-card" role="region" aria-label="Create Support Case">
                    <div className="help-escalation-head">
                      <div>
                        <h4 className="help-escalation-title">{escalation.title}</h4>
                        <p className="help-escalation-desc">
                          {escalation.descPrompt}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="help-escalation-close"
                        onClick={() => setEscalation((prev) => ({ ...prev, isOpen: false, error: null }))}
                        aria-label="Cancel case creation"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {escalation.error && (
                      <div className="help-escalation-error" role="alert">
                        <AlertCircle size={14} />
                        <span>{escalation.error}</span>
                      </div>
                    )}

                    <form onSubmit={submitEscalationForm} className="help-escalation-form">
                      <div className="help-form-group">
                        <label className="help-form-label" htmlFor="esc-name">
                          Your Name *
                        </label>
                        <input
                          id="esc-name"
                          type="text"
                          required
                          value={escalation.name}
                          onChange={(e) => setEscalation((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Sarah Jenkins"
                          className="help-form-input"
                          disabled={escalation.isSubmitting}
                        />
                      </div>

                      <div className="help-form-group">
                        <label className="help-form-label" htmlFor="esc-email">
                          Account Email *
                        </label>
                        <input
                          id="esc-email"
                          type="email"
                          required
                          value={escalation.email}
                          onChange={(e) => setEscalation((prev) => ({ ...prev, email: e.target.value }))}
                          placeholder="e.g. sarah@example.com"
                          className="help-form-input"
                          disabled={escalation.isSubmitting}
                        />
                      </div>

                      <div className="help-form-group">
                        <label className="help-form-label" htmlFor="esc-booking">
                          Booking Reference <span className="help-form-hint">(optional)</span>
                        </label>
                        <input
                          id="esc-booking"
                          type="text"
                          value={escalation.bookingRef}
                          onChange={(e) => setEscalation((prev) => ({ ...prev, bookingRef: e.target.value }))}
                          placeholder="e.g. BK-84920"
                          className="help-form-input"
                          disabled={escalation.isSubmitting}
                        />
                      </div>

                      <div className="help-form-group">
                        <label className="help-form-label" htmlFor="esc-desc">
                          Issue Description *
                        </label>
                        <textarea
                          id="esc-desc"
                          rows={3}
                          required
                          value={escalation.description}
                          onChange={(e) => setEscalation((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="Please describe what happened (do not include passwords or full card numbers)…"
                          className="help-form-textarea"
                          disabled={escalation.isSubmitting}
                        />
                      </div>

                      <div className="help-escalation-actions">
                        <button
                          type="button"
                          className="help-btn-secondary"
                          onClick={() => setEscalation((prev) => ({ ...prev, isOpen: false, error: null }))}
                          disabled={escalation.isSubmitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="help-btn-primary"
                          disabled={escalation.isSubmitting}
                        >
                          {escalation.isSubmitting ? (
                            <>
                              <Loader2 size={14} className="help-spin" />
                              <span>Submitting case…</span>
                            </>
                          ) : (
                            <span>Create support case →</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* STARTER CHIPS — VISIBLE ONLY BEFORE USER SENDS FIRST MESSAGE */}
                {!hasUserSentMessage && !isTyping && !escalation.isOpen && (
                  <div className="help-starter-chips-wrap">
                    <div className="help-starter-chips">
                      {STARTER_CHIPS.map((chip) => {
                        const IconComponent = chip.icon;
                        return (
                          <button
                            type="button"
                            key={chip.id}
                            className="help-starter-chip"
                            onClick={() => executeSendMessage(chip.query)}
                          >
                            <IconComponent size={13} />
                            <span>{chip.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* CHAT COMPOSER FOOTER */}
            <footer className="help-composer-footer">
              <form
                className="help-composer-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  executeSendMessage(inputText);
                }}
              >
                <div className="help-composer-wrap">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputText}
                    disabled={isTyping}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 84)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        executeSendMessage(inputText);
                      }
                    }}
                    placeholder={isTyping ? "HireALocals helper is typing…" : "Type your question…"}
                    className="help-composer-input"
                    aria-label="Type your question"
                  />
                  <button
                    type="submit"
                    className="help-composer-send"
                    disabled={!inputText.trim() || isTyping}
                    aria-label="Send question"
                    title="Send"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>
            </footer>
          </div>
        )}
    </>
  );
}
