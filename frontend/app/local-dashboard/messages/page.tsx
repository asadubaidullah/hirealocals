/* HIREALOCALS MESSAGES V755 UNREAD RESIZE */
/* HIREALOCALS MESSAGES V754R1 MENU POSITION */
/* HIREALOCALS MESSAGES V752 TOOLBAR POLISH */
/* HIREALOCALS MESSAGES V751 CLEAN SELECTION */
/* HIREALOCALS MESSAGES V75 GMAIL UX */
/* HIREALOCALS MESSAGES V74 SELECTION */
/* HIREALOCALS MESSAGES V73R4 */
"use client";

import { createPortal } from "react-dom";

/* HIREALOCALS MESSAGES ACTIONS FRONTEND V72 */

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Archive,
  ArrowLeft,
  CalendarDays,
  Eraser,
  Flag,
  ImagePlus,
  Inbox,
  LoaderCircle,
  MapPin,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Send,
  Trash2,
  X,
} from "lucide-react";

import { authedFetch } from "@/lib/api";


type Booking = {
  id: number;
  tourist_name: string;
  service_title: string;
  booking_date: string;
  status: string;
  message_count: number;
  unread_count: number;
};


type Msg = {
  id: number;
  sender_name: string;
  sender_role: string;
  body: string;
  created_at: string;
  mine: boolean;
};


type ConversationState = {
  booking_id: number;
  archived: boolean;
  cleared_at: string | null;
  deleted_at: string | null;
};


type ViewMode =
  | "inbox"
  | "archived"
  | "trash";


function initial(name?: string) {
  return name?.trim().charAt(0).toUpperCase() || "T";
}


function prettyDate(value?: string) {

  if (!value) return "";

  const parts = value.split("-").map(Number);

  if (parts.length !== 3) return value;

  const [year, month, day] = parts;

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(
    new Date(year, month - 1, day)
  );
}


function messageTime(value: string) {

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(
    undefined,
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}


function messageBody(
  body: string
): ReactNode {

  const match =
    body.match(
      /https:\/\/www\.google\.com\/maps\?q=[^\s]+/
    );

  if (!match) {
    return body;
  }

  const url = match[0];

  const before =
    body
      .replace(url, "")
      .trim();

  return (
    <>
      {before && (
        <span className="lm-location-copy">
          {before}
        </span>
      )}

      <a
        className="lm-location-link"
        href={url}
        target="_blank"
        rel="noreferrer"
      >
        <MapPin size={14} />
        View shared location
      </a>
    </>
  );
}


function buildStateMap(
  rows: ConversationState[]
) {

  const result:
    Record<number, ConversationState> = {};

  for (const row of rows) {
    result[row.booking_id] = row;
  }

  return result;
}


export default function Page() {

  const [
    bookings,
    setBookings,
  ] = useState<Booking[]>([]);

  const [
    conversationStates,
    setConversationStates,
  ] =
    useState<
      Record<number, ConversationState>
    >({});

  const [
    view,
    setView,
  ] =
    useState<ViewMode>("inbox");

  const [
    selected,
    setSelected,
  ] =
    useState<number | null>(null);

  const [
    messages,
    setMessages,
  ] =
    useState<Msg[]>([]);

  const [
    loadingBookings,
    setLoadingBookings,
  ] = useState(true);

  const [
    loadingMessages,
    setLoadingMessages,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    sharingLocation,
    setSharingLocation,
  ] = useState(false);

  const [
    mobileChatOpen,
    setMobileChatOpen,
  ] = useState(false);

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);


  const [
    menuAnchor,
    setMenuAnchor,
  ] = useState({
    top: 0,
    right: 8,
  });


  const [
    bulkSelected,
    setBulkSelected,
  ] = useState<number[]>([]);


  const longPressTimerRef =
    useRef<
      ReturnType<typeof setTimeout> | null
    >(null);


  const longPressTriggeredRef =
    useRef(false);


  const selectionMode =
    bulkSelected.length > 0;


  /*
    Floating menu coordinates belong to the viewport
    in which the 3-dot button was tapped.

    If viewport/orientation changes, close the menu.
    Next tap calculates fresh coordinates.
  */
  useEffect(() => {

    const handleViewportChange =
      () => {
        setMenuOpen(false);
      };


    window.addEventListener(
      "resize",
      handleViewportChange
    );

    window.addEventListener(
      "orientationchange",
      handleViewportChange
    );


    return () => {

      window.removeEventListener(
        "resize",
        handleViewportChange
      );

      window.removeEventListener(
        "orientationchange",
        handleViewportChange
      );
    };

  }, []);

  const [
    actionBusy,
    setActionBusy,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    reportOpen,
    setReportOpen,
  ] = useState(false);

  const [
    reportReason,
    setReportReason,
  ] =
    useState("safety_concern");

  const [
    reportDetails,
    setReportDetails,
  ] = useState("");

  const [
    reportFile,
    setReportFile,
  ] =
    useState<File | null>(null);

  const [
    reporting,
    setReporting,
  ] = useState(false);

  const [
    reportReference,
    setReportReference,
  ] = useState("");

  const bottomRef =
    useRef<HTMLDivElement | null>(null);


  const current =
    useMemo(
      () =>
        bookings.find(
          booking =>
            booking.id === selected
        ) || null,
      [bookings, selected]
    );


  const visibleBookings =
    useMemo(
      () =>
        bookings.filter(
          booking => {

            const state =
              conversationStates[
                booking.id
              ];

            if (view === "trash") {
              return Boolean(
                state?.deleted_at
              );
            }

            if (state?.deleted_at) {
              return false;
            }

            if (view === "archived") {
              return Boolean(
                state?.archived
              );
            }

            return !state?.archived;
          }
        ),
      [
        bookings,
        conversationStates,
        view,
      ]
    );


  const inboxCount =
    useMemo(
      () =>
        bookings.filter(
          booking => {

            const state =
              conversationStates[
                booking.id
              ];

            return (
              !state?.deleted_at &&
              !state?.archived &&
              Number(
                booking.unread_count ||
                0
              ) > 0
            );
          }
        ).length,
      [
        bookings,
        conversationStates,
      ]
    );


  const archivedCount =
    useMemo(
      () =>
        bookings.filter(
          booking => {

            const state =
              conversationStates[
                booking.id
              ];

            return (
              !state?.deleted_at &&
              Boolean(
                state?.archived
              )
            );
          }
        ).length,
      [
        bookings,
        conversationStates,
      ]
    );


  const trashCount =
    useMemo(
      () =>
        bookings.filter(
          booking =>
            Boolean(
              conversationStates[
                booking.id
              ]?.deleted_at
            )
        ).length,
      [
        bookings,
        conversationStates,
      ]
    );


  const currentState =
    selected
      ? conversationStates[selected]
      : undefined;


  async function loadBookings() {

    setLoadingBookings(true);

    try {

      const [
        bookingResponse,
        statesResponse,
      ] =
        await Promise.all([
          authedFetch(
            "/api/local/bookings"
          ),

          authedFetch(
            "/api/messages/conversation-states"
          ),
        ]);


      if (!bookingResponse.ok) {

        throw new Error(
          "Could not load booking conversations"
        );
      }


      const list: Booking[] =
        await bookingResponse.json();


      const stateRows:
        ConversationState[] =
          statesResponse.ok
            ? await statesResponse.json()
            : [];


      const nextStates =
        buildStateMap(stateRows);


      setBookings(list);

      setConversationStates(
        nextStates
      );


      const requested =
        typeof window !== "undefined"
          ? Number(
              new URLSearchParams(
                window.location.search
              ).get("booking")
            )
          : 0;


      const requestedExists =
        Boolean(
          requested &&
          list.some(
            item =>
              item.id === requested
          ) &&
          !nextStates[
            requested
          ]?.deleted_at
        );


      const firstInbox =
        list.find(
          booking =>
            !nextStates[
              booking.id
            ]?.deleted_at &&
            !nextStates[
              booking.id
            ]?.archived
        )?.id || null;


      setSelected(
        requestedExists
          ? requested
          : firstInbox
      );


      if (requestedExists) {
        setMobileChatOpen(true);
      }


      setError("");

    } catch (err: any) {

      setError(
        err?.message ||
        "Could not load conversations"
      );

    } finally {

      setLoadingBookings(false);
    }
  }


  async function refreshStatesSilent() {

    try {

      const response =
        await authedFetch(
          "/api/messages/conversation-states"
        );


      if (response.ok) {

        const rows:
          ConversationState[] =
            await response.json();

        setConversationStates(
          buildStateMap(rows)
        );
      }

    } catch {
      // Non-blocking refresh.
    }
  }


  async function refreshBookingsSilent() {

    try {

      const response =
        await authedFetch(
          "/api/local/bookings"
        );

      if (response.ok) {

        setBookings(
          await response.json()
        );
      }

    } catch {
      // Keep the active UI visible.
    }
  }


  async function markConversationRead(
    bookingId: number
  ) {

    setBookings(
      rows =>
        rows.map(
          booking =>
            booking.id === bookingId
              ? {
                  ...booking,
                  unread_count: 0,
                }
              : booking
        )
    );


    try {

      await authedFetch(
        `/api/bookings/${bookingId}/messages/read`,
        {
          method: "PATCH",
        }
      );

    } catch {
      // Read update is non-blocking.
    }
  }


  async function loadMessages(
    bookingId: number
  ) {

    setLoadingMessages(true);

    try {

      const response =
        await authedFetch(
          `/api/bookings/${bookingId}/messages`
        );


      if (!response.ok) {

        throw new Error(
          "Could not load messages"
        );
      }


      setMessages(
        await response.json()
      );

      setError("");

    } catch (err: any) {

      setMessages([]);

      setError(
        err?.message ||
        "Could not load messages"
      );

    } finally {

      setLoadingMessages(false);
    }
  }


  useEffect(() => {
    void loadBookings();
  }, []);


  useEffect(() => {

    if (loadingBookings) {
      return;
    }


    const stillVisible =
      selected &&
      visibleBookings.some(
        booking =>
          booking.id === selected
      );


    if (!stillVisible) {

      setSelected(
        visibleBookings[0]?.id ||
        null
      );
    }

  }, [
    loadingBookings,
    selected,
    visibleBookings,
  ]);


  useEffect(() => {

    if (selected) {

      void loadMessages(
        selected
      );

    } else {

      setMessages([]);
    }

  }, [selected]);


  useEffect(() => {

    if (!selected) {
      return;
    }


    if (
      typeof window !== "undefined" &&
      window.innerWidth > 700
    ) {

      void markConversationRead(
        selected
      );
    }

  }, [selected]);


  useEffect(() => {

    if (
      selected &&
      mobileChatOpen
    ) {

      void markConversationRead(
        selected
      );
    }

  }, [
    selected,
    mobileChatOpen,
  ]);


  useEffect(() => {

    if (
      loadingMessages ||
      messages.length === 0
    ) {
      return;
    }


    window.requestAnimationFrame(
      () => {

        const chatBody =
          bottomRef.current
            ?.closest(
              ".lm3-chat-body"
            );

        if (chatBody) {
          chatBody.scrollTop =
            chatBody.scrollHeight;
        }
      }
    );

  }, [
    messages,
    loadingMessages,
  ]);



  function cancelLongPress() {

    if (
      longPressTimerRef.current
    ) {

      clearTimeout(
        longPressTimerRef.current
      );

      longPressTimerRef.current =
        null;
    }
  }


  function toggleBulkSelection(
    bookingId: number
  ) {

    setBulkSelected(
      rows =>
        rows.includes(bookingId)
          ? rows.filter(
              id =>
                id !== bookingId
            )
          : [
              ...rows,
              bookingId,
            ]
    );
  }


  function startLongPress(
    bookingId: number
  ) {

    cancelLongPress();

    longPressTriggeredRef.current =
      false;

    longPressTimerRef.current =
      setTimeout(
        () => {

          longPressTriggeredRef.current =
            true;

          setBulkSelected(
            rows =>
              rows.includes(
                bookingId
              )
                ? rows
                : [
                    ...rows,
                    bookingId,
                  ]
          );

          setSelected(null);

          setMobileChatOpen(false);

          setMenuOpen(false);


          if (
            typeof navigator !==
              "undefined" &&
            navigator.vibrate
          ) {

            navigator.vibrate(18);
          }

        },
        480
      );
  }


  function activateThread(
    bookingId: number
  ) {

    if (
      longPressTriggeredRef.current
    ) {

      longPressTriggeredRef.current =
        false;

      return;
    }


    if (selectionMode) {

      toggleBulkSelection(
        bookingId
      );

      return;
    }


    openConversation(
      bookingId
    );
  }


  function cancelSelection() {

    cancelLongPress();

    longPressTriggeredRef.current =
      false;

    setBulkSelected([]);
  }


  function selectAllVisible() {

    setBulkSelected(
      visibleBookings.map(
        booking =>
          booking.id
      )
    );
  }


  async function runBulkAction(
    action:
      | "archive"
      | "unarchive"
      | "clear"
      | "delete"
      | "restore"
      | "read"
  ) {

    const bookingIds =
      [...bulkSelected];


    if (
      bookingIds.length === 0
    ) {
      return;
    }


    if (
      action === "clear" &&
      !window.confirm(
        `Clear ${bookingIds.length} selected conversation(s) for you?`
      )
    ) {
      return;
    }


    if (
      action === "delete" &&
      !window.confirm(
        `Move ${bookingIds.length} selected conversation(s) to Trash?`
      )
    ) {
      return;
    }


    setActionBusy(
      `bulk-${action}`
    );

    setError("");


    try {

      const results =
        await Promise.allSettled(

          bookingIds.map(
            async bookingId => {

              const response =
                action === "read"
                  ? await authedFetch(
                      `/api/bookings/${bookingId}/messages/read`,
                      {
                        method:
                          "PATCH",
                      }
                    )
                  : await authedFetch(
                      `/api/bookings/${bookingId}/conversation-state`,
                      {
                        method:
                          "PATCH",

                        body:
                          JSON.stringify({
                            action,
                          }),
                      }
                    );


              if (!response.ok) {

                const data =
                  await response
                    .json()
                    .catch(
                      () => ({})
                    );


                throw new Error(
                  data.detail ||
                  `Action failed for booking ${bookingId}`
                );
              }
            }
          )
        );


      const failures =
        results.filter(
          result =>
            result.status ===
            "rejected"
        ).length;


      await Promise.allSettled([
        refreshBookingsSilent(),
        refreshStatesSilent(),
      ]);


      setBulkSelected([]);

      setSelected(null);

      setMobileChatOpen(false);

      setMenuOpen(false);


      if (failures > 0) {

        setError(
          `${failures} selected conversation action(s) could not be completed.`
        );
      }

    } catch (err: any) {

      setError(
        err?.message ||
        "Bulk conversation action failed."
      );

    } finally {

      setActionBusy("");
    }
  }


  function openConversation(
    bookingId: number
  ) {

    setSelected(bookingId);

    setMobileChatOpen(true);

    setMenuOpen(false);
  }


  function changeView(
    nextView: ViewMode
  ) {

    setView(nextView);

    setBulkSelected([]);

    setMobileChatOpen(false);

    setMenuOpen(false);

    const next =
      bookings.find(
        booking => {

          const state =
            conversationStates[
              booking.id
            ];

          if (nextView === "trash") {
            return Boolean(
              state?.deleted_at
            );
          }

          if (state?.deleted_at) {
            return false;
          }

          return nextView ===
            "archived"
            ? Boolean(
                state?.archived
              )
            : !state?.archived;
        }
      );

    setSelected(
      next?.id || null
    );
  }


  async function refreshMessagesSilent(
    bookingId: number
  ) {

    try {

      const response =
        await authedFetch(
          `/api/bookings/${bookingId}/messages`
        );


      if (response.ok) {

        setMessages(
          await response.json()
        );
      }

    } catch {
      // Keep optimistic messages visible.
    }
  }


  async function postMessage(
    body: string
  ) {

    if (!selected) {
      throw new Error(
        "No conversation selected"
      );
    }


    const bookingId = selected;

    const temporaryId =
      -Date.now();


    const optimistic:
      Msg = {

      id: temporaryId,

      sender_name: "You",

      sender_role: "local",

      body,

      created_at:
        new Date().toISOString(),

      mine: true,
    };


    setMessages(
      rows => [
        ...rows,
        optimistic,
      ]
    );


    try {

      const response =
        await authedFetch(
          `/api/bookings/${bookingId}/messages`,
          {
            method: "POST",

            body:
              JSON.stringify({
                body,
              }),
          }
        );


      const data =
        await response
          .json()
          .catch(() => ({}));


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Message could not be sent"
        );
      }


      void Promise.all([
        refreshMessagesSilent(
          bookingId
        ),
        refreshBookingsSilent(),
        refreshStatesSilent(),
      ]).catch(() => {
        // Optimistic message stays visible.
        // Reconciliation continues in background.
      });


    } catch (err) {

      setMessages(
        rows =>
          rows.filter(
            message =>
              message.id !==
              temporaryId
          )
      );

      throw err;
    }
  }


  async function send(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    if (
      !selected ||
      sending
    ) {
      return;
    }


    const form =
      event.currentTarget;

    const body =
      String(
        new FormData(
          form
        ).get("body") || ""
      ).trim();


    if (!body) {
      return;
    }


    setSending(true);
    setError("");


    try {

      await postMessage(body);

      form.reset();

    } catch (err: any) {

      setError(
        err?.message ||
        "Message could not be sent"
      );

    } finally {

      setSending(false);
    }
  }


  function shareLocation() {

    if (
      !selected ||
      sharingLocation
    ) {
      return;
    }


    if (
      typeof navigator ===
        "undefined" ||
      !navigator.geolocation
    ) {

      setError(
        "Location sharing is not supported by this browser."
      );

      return;
    }


    setSharingLocation(true);

    setError("");


    navigator.geolocation
      .getCurrentPosition(

        async position => {

          try {

            const latitude =
              position.coords.latitude;

            const longitude =
              position.coords.longitude;

            const mapsUrl =
              `https://www.google.com/maps?q=${latitude},${longitude}`;


            await postMessage(
              `?? Current location shared\n${mapsUrl}`
            );

          } catch (err: any) {

            setError(
              err?.message ||
              "Could not share location"
            );

          } finally {

            setSharingLocation(false);
          }
        },


        locationError => {

          setError(
            locationError.code === 1
              ? "Location permission was not granted."
              : "Could not access your location."
          );

          setSharingLocation(false);
        },


        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        }
      );
  }


  async function mutateConversation(
    action:
      | "archive"
      | "unarchive"
      | "clear"
      | "delete"
      | "restore"
  ) {

    if (!selected) {
      return;
    }


    const bookingId =
      selected;


    setActionBusy(action);

    setError("");


    try {

      const response =
        await authedFetch(
          `/api/bookings/${bookingId}/conversation-state`,
          {
            method: "PATCH",

            body:
              JSON.stringify({
                action,
              }),
          }
        );


      const data =
        await response
          .json()
          .catch(() => ({}));


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Could not update conversation"
        );
      }


      setConversationStates(
        currentStates => ({
          ...currentStates,

          [bookingId]:
            data as ConversationState,
        })
      );


      if (action === "clear") {
        setMessages([]);
      }


      if (
        action === "archive" ||
        action === "unarchive" ||
        action === "delete"
      ) {

        setMobileChatOpen(false);
      }


      setMenuOpen(false);

    } catch (err: any) {

      setError(
        err?.message ||
        "Could not update conversation"
      );

    } finally {

      setActionBusy("");
    }
  }


  async function clearConversation() {

    if (
      !window.confirm(
        "Clear this chat for you? The shared booking record will remain safe."
      )
    ) {
      return;
    }


    await mutateConversation(
      "clear"
    );
  }


  async function deleteConversation() {

    if (
      !window.confirm(
        "Move this conversation to Trash? You can restore it later."
      )
    ) {
      return;
    }


    await mutateConversation(
      "delete"
    );
  }


  async function restoreConversation() {

    if (!selected) {
      return;
    }

    const bookingId =
      selected;

    await mutateConversation(
      "restore"
    );

    setView("inbox");
    setSelected(bookingId);
    setMobileChatOpen(false);
    setMenuOpen(false);
  }


  function openReport() {

    setMenuOpen(false);

    setReportOpen(true);

    setReportReference("");

    setReportDetails("");

    setReportFile(null);
  }


  function closeReport() {

    if (reporting) {
      return;
    }


    setReportOpen(false);

    setReportReference("");

    setReportDetails("");

    setReportFile(null);
  }


  async function submitReport(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    if (
      !selected ||
      reporting
    ) {
      return;
    }


    if (
      reportDetails.trim().length <
      3
    ) {

      setError(
        "Please briefly explain what happened."
      );

      return;
    }


    setReporting(true);

    setError("");


    try {

      const form =
        new FormData();

      form.append(
        "reason",
        reportReason
      );

      form.append(
        "details",
        reportDetails.trim()
      );


      if (reportFile) {

        form.append(
          "screenshot",
          reportFile
        );
      }


      const response =
        await authedFetch(
          `/api/bookings/${selected}/report`,
          {
            method: "POST",
            body: form,
          }
        );


      const data =
        await response
          .json()
          .catch(() => ({}));


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Could not submit report"
        );
      }


      setReportReference(
        data.reference ||
        "Report submitted"
      );

    } catch (err: any) {

      setError(
        err?.message ||
        "Could not submit report"
      );

    } finally {

      setReporting(false);
    }
  }


  return (

    <div className="local-messages-app">

      <header className="lm3-page-head">

        <div>

          <span className="eyebrow">
            Local workspace
          </span>

          <h2>
            Messages
          </h2>

          <p>
            Booking-linked conversations with your travelers.
          </p>

        </div>

      </header>


      {error && (
        <div className="lm3-error">
          {error}
        </div>
      )}


      {loadingBookings ? (

        <div className="lm3-loading-page">

          <LoaderCircle
            size={22}
            className="lm3-spin"
          />

          Loading conversations...

        </div>

      ) : bookings.length === 0 ? (

        <div className="lm3-no-conversations">

          <Inbox size={27} />

          <h3>
            No conversations yet
          </h3>

          <p>
            Booking conversations will appear here when travelers contact you.
          </p>

        </div>

      ) : (

        <div
          className={
            `lm3-app ${
              mobileChatOpen
                ? "mobile-chat-open"
                : ""
            }`
          }
        >


          <aside className="lm3-inbox">

            <header className="lm3-inbox-head">

              <div className="lm72-inbox-label">

                <strong>
                  <Inbox size={15} />
                  Conversations
                </strong>

              </div>


              <div className="lm72-tabs">

                <button
                  type="button"
                  className={
                    view === "inbox"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    changeView("inbox")
                  }
                >
                  Inbox

                  {inboxCount > 0 && (
                    <span>
                      {inboxCount}
                    </span>
                  )}
                </button>


                <button
                  type="button"
                  className={
                    view === "archived"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    changeView(
                      "archived"
                    )
                  }
                >
                  Archived

                  {archivedCount > 0 && (
                    <span>
                      {archivedCount}
                    </span>
                  )}

                </button>


                <button
                  type="button"
                  className={
                    view === "trash"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    changeView(
                      "trash"
                    )
                  }
                >
                  Trash

                  {trashCount > 0 && (
                    <span>
                      {trashCount}
                    </span>
                  )}

                </button>

              </div>



              {selectionMode && (

                <div
                  className="lm74-selection-panel lm75-gmail-toolbar"
                  role="toolbar"
                  aria-label="Selected conversation actions"
                >

                  <div className="lm75-toolbar-left">

                    <button
                      type="button"
                      className="lm75-icon-button"
                      title="Cancel selection"
                      aria-label="Cancel selection"
                      onClick={
                        cancelSelection
                      }
                    >
                      <X size={18} />
                    </button>


                    <strong className="lm75-selected-count">
                      {bulkSelected.length}

                      <span>
                        {" "}
                        selected
                      </span>
                    </strong>



                  </div>


                  <div className="lm75-toolbar-actions">

                    <button
                      type="button"
                      className="lm751-select-all"
                      title="Select all visible conversations"
                      onClick={
                        selectAllVisible
                      }
                    >
                      All
                    </button>


                    <span
                      className="lm751-toolbar-divider"
                      aria-hidden="true"
                    />


                    {view === "inbox" && (

                      <button
                        type="button"
                        className="lm75-icon-button"
                        title="Archive"
                        aria-label="Archive selected conversations"
                        disabled={
                          Boolean(
                            actionBusy
                          )
                        }
                        onClick={() =>
                          runBulkAction(
                            "archive"
                          )
                        }
                      >
                        <Archive size={18} />
                      </button>

                    )}


                    {view === "archived" && (

                      <button
                        type="button"
                        className="lm75-icon-button"
                        title="Move to Inbox"
                        aria-label="Move selected conversations to Inbox"
                        disabled={
                          Boolean(
                            actionBusy
                          )
                        }
                        onClick={() =>
                          runBulkAction(
                            "unarchive"
                          )
                        }
                      >
                        <Inbox size={18} />
                      </button>

                    )}


                    {view === "trash" && (

                      <button
                        type="button"
                        className="lm75-icon-button"
                        title="Restore to Inbox"
                        aria-label="Restore selected conversations"
                        disabled={
                          Boolean(
                            actionBusy
                          )
                        }
                        onClick={() =>
                          runBulkAction(
                            "restore"
                          )
                        }
                      >
                        <Inbox size={18} />
                      </button>

                    )}


                    {view !== "trash" && (
                      <>

                        <button
                          type="button"
                          className="lm75-icon-button"
                          title="Mark as read"
                          aria-label="Mark selected conversations as read"
                          disabled={
                            Boolean(
                              actionBusy
                            )
                          }
                          onClick={() =>
                            runBulkAction(
                              "read"
                            )
                          }
                        >
                          <Mail size={18} />
                        </button>


                        <button
                          type="button"
                          className="lm75-icon-button"
                          title="Clear chat for me"
                          aria-label="Clear selected conversations"
                          disabled={
                            Boolean(
                              actionBusy
                            )
                          }
                          onClick={() =>
                            runBulkAction(
                              "clear"
                            )
                          }
                        >
                          <Eraser size={18} />
                        </button>


                        <button
                          type="button"
                          className="lm75-icon-button danger"
                          title="Move to Trash"
                          aria-label="Move selected conversations to Trash"
                          disabled={
                            Boolean(
                              actionBusy
                            )
                          }
                          onClick={() =>
                            runBulkAction(
                              "delete"
                            )
                          }
                        >
                          <Trash2 size={18} />
                        </button>

                      </>
                    )}

                  </div>

                </div>

              )}

            </header>


            <div
              className={
                `lm3-thread-list ${
                  selectionMode
                    ? "selection-mode"
                    : ""
                }`
              }
            >

              {visibleBookings.length ? (

                visibleBookings.map(
                  booking => {

                    const active =
                      selected ===
                      booking.id;


                    const chosen =
                      bulkSelected.includes(
                        booking.id
                      );


                    return (

                      <button
                        type="button"
                        key={booking.id}
                        className={
                          `${
                            active
                              ? "active"
                              : ""
                          }${
                            chosen
                              ? " is-selected"
                              : ""
                          }`
                        }
                        onPointerDown={
                          event => {

                            if (
                              event.pointerType ===
                                "mouse" &&
                              event.button !== 0
                            ) {
                              return;
                            }

                            startLongPress(
                              booking.id
                            );
                          }
                        }
                        onPointerUp={
                          cancelLongPress
                        }
                        onPointerCancel={
                          cancelLongPress
                        }
                        onPointerLeave={
                          cancelLongPress
                        }
                        onContextMenu={
                          event =>
                            event.preventDefault()
                        }
                        onClick={() =>
                          activateThread(
                            booking.id
                          )
                        }
                      >

                        <span className="lm3-thread-avatar">

                          {initial(
                            booking.tourist_name
                          )}

                        </span>


                        <span className="lm3-thread-main">

                          <span className="lm3-thread-name">

                            <strong>
                              {booking.tourist_name}
                            </strong>


                            {booking.unread_count >
                              0 && (

                              <em>
                                {booking.unread_count}
                              </em>

                            )}

                          </span>


                          <span className="lm3-thread-service">

                            {booking.service_title}

                          </span>


                          <span className="lm3-thread-bottom">

                            <small>

                              <CalendarDays
                                size={11}
                              />

                              {prettyDate(
                                booking.booking_date
                              )}

                            </small>


                            <span
                              className={
                                `lm3-status lm3-status-${booking.status}`
                              }
                            >
                              {booking.status}
                            </span>

                          </span>

                        </span>

                      </button>

                    );
                  }
                )

              ) : (

                <div className="lm72-empty-list">

                  {view === "trash"
                    ? <Trash2 size={22} />
                    : <Archive size={22} />}

                  <strong>
                    {view === "archived"
                      ? "No archived conversations"
                      : view === "trash"
                        ? "Trash is empty"
                        : "Inbox is clear"}
                  </strong>

                  <span>
                    {view === "archived"
                      ? "Archived chats will appear here."
                      : view === "trash"
                        ? "Conversations moved to Trash will appear here."
                        : "New booking messages will appear here."}
                  </span>

                </div>

              )}

            </div>

          </aside>


          <section className="lm3-chat">

            {current ? (

              <>

                <header className="lm3-chat-head">


                  <button
                    type="button"
                    className="lm3-mobile-back"
                    onClick={() => {
                      setMobileChatOpen(
                        false
                      );
                      setMenuOpen(false);
                    }}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={20} />
                  </button>


                  <span className="lm3-chat-avatar">

                    {initial(
                      current.tourist_name
                    )}

                  </span>


                  <div className="lm3-chat-identity">

                    <strong>
                      {current.tourist_name}
                    </strong>

                    <span>
                      {current.service_title}
                    </span>

                  </div>


                  <div className="lm72-head-actions">

                    <div className="lm3-chat-status">

                      <span
                        className={
                          `lm3-status lm3-status-${current.status}`
                        }
                      >
                        {current.status}
                      </span>

                      <small>
                        {prettyDate(
                          current.booking_date
                        )}
                      </small>

                    </div>


                    <button
                      type="button"
                      className="lm72-more"
                      aria-label="Conversation options"
                      onClick={
                        event => {

                          const rect =
                            event
                              .currentTarget
                              .getBoundingClientRect();


                          setMenuAnchor({
                            top:
                              rect.bottom +
                              8,

                            right:
                              Math.max(
                                8,
                                window.innerWidth -
                                  rect.right
                              ),
                          });


                          setMenuOpen(
                            value =>
                              !value
                          );
                        }
                      }
                    >
                      <MoreHorizontal
                        size={20}
                      />
                    </button>


                    {menuOpen &&
                      typeof document !== "undefined" &&
                      createPortal(

                      <div
                        className="lm72-menu lm72-menu-portal"
                        style={{
                          "--lm-menu-top":
                            `${menuAnchor.top}px`,

                          "--lm-menu-right":
                            `${menuAnchor.right}px`,
                        } as any}
                      >

                        {currentState?.deleted_at ? (

                          <button
                            type="button"
                            disabled={
                              Boolean(
                                actionBusy
                              )
                            }
                            onClick={
                              restoreConversation
                            }
                          >
                            <Inbox size={17} />

                            <span>
                              <strong>
                                Restore to Inbox
                              </strong>

                              <small>
                                Return this conversation to Inbox
                              </small>
                            </span>
                          </button>

                        ) : (
                          <>

                            <button
                              type="button"
                              disabled={
                                Boolean(
                                  actionBusy
                                )
                              }
                              onClick={
                                clearConversation
                              }
                            >
                              <Eraser size={17} />

                              <span>
                                <strong>
                                  Clear chat
                                </strong>

                                <small>
                                  Clear for you only
                                </small>
                              </span>
                            </button>


                            <button
                              type="button"
                              disabled={
                                Boolean(
                                  actionBusy
                                )
                              }
                              onClick={() =>
                                mutateConversation(
                                  currentState?.archived
                                    ? "unarchive"
                                    : "archive"
                                )
                              }
                            >
                              <Archive size={17} />

                              <span>

                                <strong>
                                  {currentState?.archived
                                    ? "Move to Inbox"
                                    : "Archive conversation"}
                                </strong>

                                <small>
                                  {currentState?.archived
                                    ? "Restore this conversation"
                                    : "Keep it outside your Inbox"}
                                </small>

                              </span>
                            </button>


                            <button
                              type="button"
                              className="report"
                              onClick={
                                openReport
                              }
                            >
                              <Flag size={17} />

                              <span>
                                <strong>
                                  Report conversation
                                </strong>

                                <small>
                                  Send to Trust & Safety
                                </small>
                              </span>
                            </button>


                            <div className="lm72-divider" />


                            <button
                              type="button"
                              className="danger"
                              disabled={
                                Boolean(
                                  actionBusy
                                )
                              }
                              onClick={
                                deleteConversation
                              }
                            >
                              <Trash2 size={17} />

                              <span>
                                <strong>
                                  Move to Trash
                                </strong>

                                <small>
                                  You can restore it later
                                </small>
                              </span>
                            </button>

                          </>
                        )}

                      </div>,
                      document.body
                    )}

                  </div>

                </header>


                <div className="lm3-chat-body">

                  {loadingMessages ? (

                    <div className="lm3-chat-loading">

                      <LoaderCircle
                        size={21}
                        className="lm3-spin"
                      />

                      Loading messages...

                    </div>

                  ) : messages.length ? (

                    messages.map(
                      (
                        message,
                        index
                      ) => {

                        const previous =
                          messages[
                            index - 1
                          ];

                        const next =
                          messages[
                            index + 1
                          ];

                        const samePrevious =
                          Boolean(
                            previous &&
                            previous.mine ===
                              message.mine
                          );

                        const sameNext =
                          Boolean(
                            next &&
                            next.mine ===
                              message.mine
                          );


                        return (

                          <article
                            key={message.id}
                            className={
                              `lm3-message ${
                                message.mine
                                  ? "mine"
                                  : "theirs"
                              } ${
                                samePrevious
                                  ? "lm72-prev"
                                  : "lm72-start"
                              } ${
                                sameNext
                                  ? "lm72-next"
                                  : "lm72-end"
                              }`
                            }
                          >

                            <div>

                              <p>
                                {messageBody(
                                  message.body
                                )}
                              </p>


                              {!sameNext && (

                                <small>
                                  {messageTime(
                                    message.created_at
                                  )}
                                </small>

                              )}

                            </div>

                          </article>

                        );
                      }
                    )

                  ) : (

                    <div className="lm3-chat-empty">

                      <span>
                        <MessageCircle
                          size={24}
                        />
                      </span>

                      <strong>
                        No visible messages
                      </strong>

                      <p>
                        Start a new message in this booking conversation.
                      </p>

                    </div>

                  )}


                  <div ref={bottomRef} />

                </div>


                <form
                  className="lm3-composer"
                  onSubmit={send}
                >

                  <button
                    type="button"
                    className="lm3-location-btn"
                    onClick={shareLocation}
                    disabled={
                      sharingLocation ||
                      sending
                    }
                    title="Share current location"
                    aria-label="Share current location"
                  >

                    {sharingLocation ? (

                      <LoaderCircle
                        size={18}
                        className="lm3-spin"
                      />

                    ) : (

                      <MapPin size={19} />

                    )}

                  </button>


                  <textarea
                    name="body"
                    rows={1}
                    placeholder="Message..."
                    required
                    onKeyDown={event => {

                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {

                        event.preventDefault();

                        event.currentTarget
                          .form
                          ?.requestSubmit();
                      }
                    }}
                  />


                  <button
                    type="submit"
                    className="lm3-send-btn"
                    disabled={
                      sending ||
                      sharingLocation
                    }
                  >

                    {sending ? (

                      <LoaderCircle
                        size={18}
                        className="lm3-spin"
                      />

                    ) : (

                      <Send size={18} />

                    )}

                    <span>
                      Send
                    </span>

                  </button>

                </form>

              </>

            ) : (

              <div className="lm72-select-chat">

                <MessageCircle
                  size={28}
                />

                <strong>
                  Select a conversation
                </strong>

                <span>
                  Choose a booking conversation from the list.
                </span>

              </div>

            )}

          </section>

        </div>

      )}


      {reportOpen && (

        <div
          className="lm72-report-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Report conversation"
        >

          <div className="lm72-report">

            <header>

              <div>

                <span className="eyebrow">
                  Trust & Safety
                </span>

                <h3>
                  Report conversation
                </h3>

                <p>
                  Booking #{selected}
                </p>

              </div>


              <button
                type="button"
                onClick={closeReport}
                aria-label="Close"
              >
                <X size={19} />
              </button>

            </header>


            {reportReference ? (

              <div className="lm72-report-success">

                <span>
                  ?
                </span>

                <strong>
                  Report received
                </strong>

                <p>
                  Reference:
                  {" "}
                  <b>
                    {reportReference}
                  </b>
                </p>

                <small>
                  The report is queued for Trust & Safety triage and can be escalated to human support when needed.
                </small>

                <button
                  type="button"
                  className="btn"
                  onClick={closeReport}
                >
                  Done
                </button>

              </div>

            ) : (

              <form onSubmit={submitReport}>

                <label>
                  Reason
                </label>

                <select
                  value={reportReason}
                  onChange={event =>
                    setReportReason(
                      event.target.value
                    )
                  }
                >

                  <option value="safety_concern">
                    Safety concern
                  </option>

                  <option value="harassment">
                    Harassment or threatening behavior
                  </option>

                  <option value="spam">
                    Spam or scam
                  </option>

                  <option value="inappropriate_content">
                    Inappropriate content
                  </option>

                  <option value="payment_request">
                    Suspicious payment request
                  </option>

                  <option value="other">
                    Other
                  </option>

                </select>


                <label>
                  What happened?
                </label>

                <textarea
                  rows={4}
                  value={reportDetails}
                  onChange={event =>
                    setReportDetails(
                      event.target.value
                    )
                  }
                  placeholder="Briefly explain the issue..."
                  required
                />


                <label className="lm72-file">

                  <ImagePlus size={18} />

                  <span>
                    <strong>
                      Add screenshot
                    </strong>

                    <small>
                      Optional ? JPG, PNG or WebP
                    </small>
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={event =>
                      setReportFile(
                        event.target.files?.[0] ||
                        null
                      )
                    }
                  />

                </label>


                {reportFile && (

                  <div className="lm72-file-name">

                    <span>
                      {reportFile.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setReportFile(null)
                      }
                    >
                      Remove
                    </button>

                  </div>

                )}


                <div className="lm72-report-note">

                  Recent conversation context is attached automatically. Screenshots are stored privately for moderation review.

                </div>


                <button
                  type="submit"
                  className="btn"
                  disabled={reporting}
                >
                  {reporting
                    ? "Submitting..."
                    : "Submit report"}
                </button>

              </form>

            )}

          </div>

        </div>

      )}

    </div>
  );
}
