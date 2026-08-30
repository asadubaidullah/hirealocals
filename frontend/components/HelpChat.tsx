"use client";

// HIREALOCALS SMART DOCKED HELP CHAT V4

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { usePathname } from "next/navigation";

import {
  Headphones,
  Mail,
  MessageCircle,
  Send,
  X,
} from "lucide-react";

import { apiUrl } from "@/lib/site";


const quickAnswers = [
  {
    q: "How do bookings work?",
    a: "Choose a city and local, review their services, then send a booking request with your date, time and trip details. The local can accept or respond before the booking moves forward.",
  },
  {
    q: "How do I become a Local?",
    a: "Open 'Become a Local', submit your details and proposed services, then wait for the HireALocals team to review your application before anything goes public.",
  },
  {
    q: "What cities are available?",
    a: "HireALocals is launching with selected cities in the United Kingdom and United States. Travelers can create accounts from any country.",
  },
  {
    q: "I need account help",
    a: "Use Forgot password on the login page for password recovery. New accounts also receive an email verification link. You can send support a message below if you still need help.",
  },
];


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


export default function HelpChat() {

  const pathname = usePathname();

  const launcherRef =
    useRef<HTMLButtonElement | null>(null);

  const dragRef =
    useRef<DragState | null>(null);

  const suppressClickRef =
    useRef(false);


  const [open, setOpen] =
    useState(false);

  const [answer, setAnswer] =
    useState(
      "Hi — I'm the HireALocals helper. Choose a common question or send a message to support."
    );

  const [showForm, setShowForm] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [status, setStatus] =
    useState("");

  const [manualPosition, setManualPosition] =
    useState<Point | null>(null);

  const [dragging, setDragging] =
    useState(false);

  const [mobile, setMobile] =
    useState(false);

  const [dock, setDock] =
    useState<Dock>({
      right: 20,
      bottom: 20,
    });


  const isLocalWorkspace =
    pathname.startsWith(
      "/local-dashboard"
    );


  function visibleLocalBottomNav() {

    if (
      typeof window === "undefined" ||
      !isLocalWorkspace ||
      window.innerWidth > 900
    ) {
      return null;
    }

    const nav =
      document.querySelector(
        ".pro-workspace-local .pro-mobile-nav"
      ) as HTMLElement | null;

    if (!nav) {
      return null;
    }

    const style =
      window.getComputedStyle(nav);

    const rect =
      nav.getBoundingClientRect();

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

    if (typeof window === "undefined") {
      return {
        right: 20,
        bottom: 20,
      };
    }

    const isMobile =
      window.innerWidth <= 900;

    const normalBottom =
      isMobile ? 14 : 20;

    const normalRight =
      isMobile ? 14 : 20;


    const navRect =
      visibleLocalBottomNav();

    if (!navRect) {
      return {
        right: normalRight,
        bottom: normalBottom,
      };
    }


    /*
      Actual navigation geometry controls the launcher.

      Example:
      navigation begins 74px above viewport bottom
      + 10px visual breathing room
      = launcher bottom 84px.

      No guessed fixed nav height.
    */

    const occupiedBottom =
      window.innerHeight -
      navRect.top;

    return {
      right: normalRight,

      bottom: Math.max(
        normalBottom,
        occupiedBottom + 10
      ),
    };
  }


  function clampManual(
    x: number,
    y: number
  ): Point {

    if (typeof window === "undefined") {
      return { x, y };
    }

    const launcher =
      launcherRef.current;

    const width =
      launcher?.offsetWidth || 44;

    const height =
      launcher?.offsetHeight || 44;

    const margin = 10;

    const maxX =
      Math.max(
        margin,
        window.innerWidth -
          width -
          margin
      );

    let maxY =
      Math.max(
        margin,
        window.innerHeight -
          height -
          margin
      );


    /*
      A manually dragged launcher may move anywhere,
      except inside the Local mobile bottom navigation.
    */

    const navRect =
      visibleLocalBottomNav();

    if (navRect) {

      maxY =
        Math.min(
          maxY,

          Math.max(
            margin,

            navRect.top -
              height -
              10
          )
        );
    }


    return {
      x: Math.min(
        Math.max(x, margin),
        maxX
      ),

      y: Math.min(
        Math.max(y, margin),
        maxY
      ),
    };
  }


  /*
    Professional docking behaviour:

    1. Initial page render:
       normal bottom-right.

    2. Local mobile navigation mounts:
       measure its REAL top edge.

    3. Update "bottom".
       CSS transition smoothly pushes Help upward.

    4. Switch back to desktop:
       bottom becomes 20px again.

    No persistent mobile coordinates are carried into desktop.
  */
  useEffect(() => {

    if (typeof window === "undefined") {
      return;
    }


    let previousMobile =
      window.innerWidth <= 900;


    setMobile(previousMobile);

    /*
      Every route starts from the standard docked position.
      Dragging is intentionally a temporary user adjustment,
      not permanent layout corruption.
    */

    setManualPosition(null);


    function measure() {

      const nextMobile =
        window.innerWidth <= 900;


      if (
        nextMobile !== previousMobile
      ) {

        previousMobile =
          nextMobile;

        setMobile(nextMobile);

        /*
          Crossing mobile / desktop breakpoint:
          return to smart docking.
        */

        setManualPosition(null);
      }


      const nextDock =
        calculateDock();


      setDock((current) => {

        if (
          current.right ===
            nextDock.right &&
          current.bottom ===
            nextDock.bottom
        ) {
          return current;
        }

        return nextDock;
      });


      /*
        If user manually dragged and navigation later
        appears, do not allow overlap.
      */

      setManualPosition(
        (current) => {

          if (!current) {
            return null;
          }

          return clampManual(
            current.x,
            current.y
          );
        }
      );
    }


    /*
      First paint = standard bottom.
      Next animation frame = measure real app shell/nav.

      This creates the intended professional
      "navigation pushes Help upward" transition.
    */

    const frame =
      window.requestAnimationFrame(
        measure
      );


    window.addEventListener(
      "resize",
      measure
    );


    /*
      LocalShell is mounted only after /api/auth/me succeeds.
      MutationObserver detects that navigation appearing
      without polling.
    */

    const observer =
      new MutationObserver(() => {
        measure();
      });


    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      }
    );


    return () => {

      window.cancelAnimationFrame(
        frame
      );

      window.removeEventListener(
        "resize",
        measure
      );

      observer.disconnect();
    };

  }, [pathname]);


  function startDrag(
    e: ReactPointerEvent<HTMLButtonElement>
  ) {

    if (
      e.pointerType === "mouse" &&
      e.button !== 0
    ) {
      return;
    }


    const launcher =
      launcherRef.current;

    if (!launcher) {
      return;
    }


    const rect =
      launcher.getBoundingClientRect();


    dragRef.current = {
      pointerId: e.pointerId,

      startX: e.clientX,
      startY: e.clientY,

      originX: rect.left,
      originY: rect.top,

      moved: false,
    };


    try {

      launcher.setPointerCapture(
        e.pointerId
      );

    } catch {
      // Safe browser no-op.
    }
  }


  function moveDrag(
    e: ReactPointerEvent<HTMLButtonElement>
  ) {

    const drag =
      dragRef.current;


    if (
      !drag ||
      drag.pointerId !== e.pointerId
    ) {
      return;
    }


    const dx =
      e.clientX -
      drag.startX;

    const dy =
      e.clientY -
      drag.startY;


    if (
      !drag.moved &&
      (
        Math.abs(dx) > 4 ||
        Math.abs(dy) > 4
      )
    ) {

      drag.moved = true;

      setDragging(true);
    }


    if (!drag.moved) {
      return;
    }


    e.preventDefault();


    setManualPosition(
      clampManual(
        drag.originX + dx,
        drag.originY + dy
      )
    );
  }


  function finishDrag(
    e: ReactPointerEvent<HTMLButtonElement>
  ) {

    const drag =
      dragRef.current;


    if (
      !drag ||
      drag.pointerId !== e.pointerId
    ) {
      return;
    }


    suppressClickRef.current =
      drag.moved;


    try {

      launcherRef.current
        ?.releasePointerCapture(
          e.pointerId
        );

    } catch {
      // Safe browser no-op.
    }


    dragRef.current = null;

    setDragging(false);
  }


  function cancelDrag(
    e: ReactPointerEvent<HTMLButtonElement>
  ) {

    if (
      dragRef.current?.pointerId !==
      e.pointerId
    ) {
      return;
    }

    dragRef.current = null;

    setDragging(false);
  }


  function openChat() {

    if (
      suppressClickRef.current
    ) {

      suppressClickRef.current =
        false;

      return;
    }

    setOpen(true);
  }


  async function submit(
    e: FormEvent<HTMLFormElement>
  ) {

    e.preventDefault();

    if (sending) {
      return;
    }


    setSending(true);
    setStatus("");


    const form =
      e.currentTarget;

    const data =
      new FormData(form);


    const payload = {

      name:
        String(
          data.get("name") || ""
        ),

      email:
        String(
          data.get("email") || ""
        ),

      subject:
        "Website help chat",

      message:
        String(
          data.get("message") || ""
        ),
    };


    try {

      const response =
        await fetch(
          `${apiUrl}/api/contact`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );


      if (!response.ok) {
        throw new Error();
      }


      setStatus(
        "Message sent. Support will reply by email."
      );

      form.reset();

    } catch {

      setStatus(
        "Could not send right now. Please use support@hirealocals.com."
      );

    } finally {

      setSending(false);
    }
  }


  if (
    pathname.startsWith("/admin")
  ) {
    return null;
  }


  const launcherStyle =
    manualPosition
      ? {
          left:
            `${manualPosition.x}px`,

          top:
            `${manualPosition.y}px`,

          right: "auto",

          bottom: "auto",
        }
      : {
          left: "auto",

          top: "auto",

          right:
            `${dock.right}px`,

          bottom:
            `${dock.bottom}px`,
        };


  // HIREALOCALS MESSAGES ROUTE HIDE V4
  if (
    pathname.startsWith("/local-dashboard/messages") ||
    pathname.startsWith("/traveler-dashboard/messages")
  ) {
    return null;
  }
  return (
    <>

      <button
        ref={launcherRef}

        type="button"

        className={
          [
            "help-launcher",
            "help-smart-launcher",

            manualPosition
              ? "is-manual"
              : "is-docked",

            dragging
              ? "is-dragging"
              : "",
          ]
            .filter(Boolean)
            .join(" ")
        }

        style={launcherStyle}

        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}

        onClick={openChat}

        aria-label="Open Help and chat. Drag to move."

        title="Drag to move · Click for Help & chat"
      >

        <MessageCircle size={20} />

        <span>
          Help & chat
        </span>

      </button>


      {open && (

        <div
          className="help-panel"
          role="dialog"
          aria-modal="false"
          aria-label="HireALocals help"
        >

          <div className="help-head">

            <div>

              <span className="help-avatar">
                <Headphones size={18} />
              </span>

              <div>

                <strong>
                  HireALocals Help
                </strong>

                <small>
                  Automated help + support message
                </small>

              </div>

            </div>


            <button
              type="button"

              onClick={() =>
                setOpen(false)
              }

              aria-label="Close help"
            >
              <X size={19} />
            </button>

          </div>


          <div className="help-body">

            <div className="help-bubble bot">
              {answer}
            </div>


            <div className="help-quick-grid">

              {quickAnswers.map(
                (item) => (

                  <button
                    type="button"
                    key={item.q}

                    onClick={() => {

                      setAnswer(
                        item.a
                      );

                      setShowForm(
                        false
                      );
                    }}
                  >
                    {item.q}
                  </button>

                )
              )}

            </div>


            <button
              type="button"
              className="help-contact-btn"

              onClick={() =>
                setShowForm(
                  (value) =>
                    !value
                )
              }
            >

              <Mail size={16} />

              {showForm
                ? "Hide support form"
                : "Message support"}

            </button>


            {showForm && (

              <form
                className="help-form"
                onSubmit={submit}
              >

                <div className="help-two">

                  <input
                    name="name"
                    placeholder="Your name"
                    required
                  />

                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    required
                  />

                </div>


                <textarea
                  name="message"
                  rows={4}
                  placeholder="How can we help?"
                  required
                />


                <button
                  className="btn"
                  disabled={sending}
                >

                  {sending ? (
                    <>
                      <span className="btn-spinner" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Send message
                    </>
                  )}

                </button>


                {status && (

                  <small className="help-status">
                    {status}
                  </small>

                )}

              </form>

            )}

          </div>

        </div>
      )}

    </>
  );
}
