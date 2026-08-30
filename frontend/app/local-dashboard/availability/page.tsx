"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Save,
  Trash2,
} from "lucide-react";

import { authedFetch } from "@/lib/api";


type Day = {
  weekday: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
};


type Override = {
  id: number;
  booking_date: string;
  enabled: boolean;
  start_time: string;
  end_time: string;
  note: string;
};


type FeedbackTone =
  | "success"
  | "error"
  | "info";


const names = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];


function todayInput() {

  const now =
    new Date();

  const local =
    new Date(
      now.getTime() -
      now.getTimezoneOffset() * 60000
    );

  return local
    .toISOString()
    .slice(0, 10);
}


function formatBookingDate(
  value: string
) {

  const parts =
    value
      .split("-")
      .map(Number);

  if (
    parts.length !== 3 ||
    parts.some(
      (part) =>
        !Number.isFinite(part)
    )
  ) {
    return value;
  }

  const [year, month, day] =
    parts;

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(
    new Date(
      year,
      month - 1,
      day
    )
  );
}


export default function Page() {

  const [days, setDays] =
    useState<Day[]>([]);

  const [
    overrides,
    setOverrides,
  ] =
    useState<Override[]>([]);

  const [
    overrideMode,
    setOverrideMode,
  ] =
    useState<
      "unavailable" |
      "custom"
    >("unavailable");

  const [
    feedback,
    setFeedback,
  ] =
    useState("");

  const [
    feedbackTone,
    setFeedbackTone,
  ] =
    useState<FeedbackTone>(
      "info"
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    savingSchedule,
    setSavingSchedule,
  ] =
    useState(false);

  const [
    savingOverride,
    setSavingOverride,
  ] =
    useState(false);

  const [
    removingId,
    setRemovingId,
  ] =
    useState<number | null>(
      null
    );


  function showFeedback(
    message: string,
    tone: FeedbackTone
  ) {

    setFeedback(message);
    setFeedbackTone(tone);
  }


  async function load() {

    setLoading(true);

    try {

      const [scheduleResponse, overrideResponse] =
        await Promise.all([
          authedFetch(
            "/api/local/availability"
          ),
          authedFetch(
            "/api/local/availability-overrides"
          ),
        ]);


      if (
        !scheduleResponse.ok ||
        !overrideResponse.ok
      ) {
        throw new Error(
          "Could not load availability"
        );
      }


      setDays(
        await scheduleResponse.json()
      );

      setOverrides(
        await overrideResponse.json()
      );

    } catch (error: any) {

      showFeedback(
        error?.message ||
          "Could not load availability",
        "error"
      );

    } finally {

      setLoading(false);
    }
  }


  useEffect(() => {
    void load();
  }, []);


  function patch(
    weekday: number,
    data: Partial<Day>
  ) {

    setDays((current) =>
      current.map((day) =>
        day.weekday === weekday
          ? {
              ...day,
              ...data,
            }
          : day
      )
    );
  }


  async function saveSchedule() {

    if (savingSchedule) {
      return;
    }

    setSavingSchedule(true);
    setFeedback("");

    try {

      const response =
        await authedFetch(
          "/api/local/availability",
          {
            method: "PUT",
            body: JSON.stringify({
              days,
            }),
          }
        );


      const data =
        await response
          .json()
          .catch(() => ({}));


      if (!response.ok) {

        showFeedback(
          data.detail ||
            "Could not save availability",
          "error"
        );

        return;
      }


      showFeedback(
        "Weekly schedule saved successfully.",
        "success"
      );

    } catch (error: any) {

      showFeedback(
        error?.message ||
          "Could not save availability",
        "error"
      );

    } finally {

      setSavingSchedule(false);
    }
  }


  async function addOverride(
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    if (savingOverride) {
      return;
    }


    const form =
      event.currentTarget;

    const formData =
      new FormData(form);


    const payload = {

      booking_date:
        String(
          formData.get(
            "booking_date"
          ) || ""
        ),

      enabled:
        overrideMode === "custom",

      start_time:
        overrideMode === "custom"
          ? String(
              formData.get(
                "start_time"
              ) || "09:00"
            )
          : "09:00",

      end_time:
        overrideMode === "custom"
          ? String(
              formData.get(
                "end_time"
              ) || "17:00"
            )
          : "17:00",

      note:
        String(
          formData.get(
            "note"
          ) || ""
        ),
    };


    if (!payload.booking_date) {

      showFeedback(
        "Please choose a date first.",
        "error"
      );

      return;
    }


    setSavingOverride(true);
    setFeedback("");


    try {

      const response =
        await authedFetch(
          "/api/local/availability-overrides",
          {
            method: "PUT",
            body:
              JSON.stringify(
                payload
              ),
          }
        );


      const data =
        await response
          .json()
          .catch(() => ({}));


      if (!response.ok) {

        showFeedback(
          data.detail ||
            "Could not save date exception",
          "error"
        );

        return;
      }


      form.reset();

      setOverrideMode(
        "unavailable"
      );


      const refresh =
        await authedFetch(
          "/api/local/availability-overrides"
        );


      if (refresh.ok) {

        setOverrides(
          await refresh.json()
        );

      }


      showFeedback(
        "Date exception saved successfully.",
        "success"
      );

    } catch (error: any) {

      showFeedback(
        error?.message ||
          "Could not save date exception",
        "error"
      );

    } finally {

      setSavingOverride(false);
    }
  }


  async function removeOverride(
    id: number
  ) {

    if (
      removingId !== null
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        "Remove this date-specific exception?"
      );


    if (!confirmed) {
      return;
    }


    setRemovingId(id);
    setFeedback("");


    try {

      const response =
        await authedFetch(
          `/api/local/availability-overrides/${id}`,
          {
            method: "DELETE",
          }
        );


      if (!response.ok) {

        const data =
          await response
            .json()
            .catch(() => ({}));


        showFeedback(
          data.detail ||
            "Could not remove exception",
          "error"
        );

        return;
      }


      setOverrides(
        (current) =>
          current.filter(
            (item) =>
              item.id !== id
          )
      );


      showFeedback(
        "Date exception removed.",
        "success"
      );

    } catch (error: any) {

      showFeedback(
        error?.message ||
          "Could not remove exception",
        "error"
      );

    } finally {

      setRemovingId(null);
    }
  }


  return (
    <div className="availability-page-pro">

      <div className="availability-pro-intro">

        <span className="eyebrow">
          Local workspace
        </span>

        <h2>
          Availability
        </h2>

        <p>
          Set your recurring working hours and manage
          special dates when your schedule changes.
        </p>

      </div>


      {feedback && (

        <div
          className={
            `availability-feedback ${feedbackTone}`
          }
          role="status"
        >

          {feedbackTone ===
          "success" ? (
            <CheckCircle2 size={18} />
          ) : feedbackTone ===
            "error" ? (
            <AlertCircle size={18} />
          ) : (
            <Clock3 size={18} />
          )}

          <span>
            {feedback}
          </span>

        </div>

      )}


      {/* ===============================================
          WEEKLY SCHEDULE
          =============================================== */}

      <section className="schedule-pro-card">

        <header className="schedule-pro-header">

          <div>

            <span className="availability-section-kicker">
              Recurring hours
            </span>

            <h3>
              Weekly schedule
            </h3>

            <p>
              Set the hours travelers can normally book you each week.
            </p>

          </div>


          <button
            type="button"
            className="availability-pro-primary"
            onClick={saveSchedule}
            disabled={
              savingSchedule ||
              loading
            }
          >

            {savingSchedule ? (
              <>
                <span className="availability-mini-spinner" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save schedule
              </>
            )}

          </button>

        </header>


        {loading &&
        days.length === 0 ? (

          <div className="availability-pro-loading">

            <span className="availability-mini-spinner" />

            <span>
              Loading your schedule...
            </span>

          </div>

        ) : (

          <div className="schedule-pro-list">

            {days.map((day) => (

              <div
                className={
                  `schedule-pro-row ${
                    day.enabled
                      ? "enabled"
                      : "disabled"
                  }`
                }
                key={day.weekday}
              >

                <div className="schedule-pro-day">

                  <label>

                    <input
                      type="checkbox"
                      checked={
                        day.enabled
                      }
                      onChange={(
                        event
                      ) =>
                        patch(
                          day.weekday,
                          {
                            enabled:
                              event
                                .target
                                .checked,
                          }
                        )
                      }
                    />

                    <span className="schedule-pro-day-name">
                      {
                        names[
                          day.weekday
                        ]
                      }
                    </span>

                  </label>


                  <span
                    className={
                      `schedule-status-pill ${
                        day.enabled
                          ? "available"
                          : "unavailable"
                      }`
                    }
                  >
                    {day.enabled
                      ? "Available"
                      : "Unavailable"}
                  </span>

                </div>


                {day.enabled ? (

                  <div className="schedule-pro-times">

                    <label>

                      <span>
                        Start
                      </span>

                      <input
                        type="time"
                        value={
                          day.start_time
                        }
                        onChange={(
                          event
                        ) =>
                          patch(
                            day.weekday,
                            {
                              start_time:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                      />

                    </label>


                    <span className="schedule-time-separator">
                      to
                    </span>


                    <label>

                      <span>
                        End
                      </span>

                      <input
                        type="time"
                        value={
                          day.end_time
                        }
                        onChange={(
                          event
                        ) =>
                          patch(
                            day.weekday,
                            {
                              end_time:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                      />

                    </label>

                  </div>

                ) : (

                  <div className="schedule-pro-off-copy">
                    Travelers will not be able to book this weekday.
                  </div>

                )}

              </div>

            ))}

          </div>

        )}

      </section>


      {/* ===============================================
          SPECIAL DATES
          =============================================== */}

      <div className="availability-pro-special-grid">

        <section className="availability-pro-card">

          <div className="availability-pro-card-head">

            <span className="availability-pro-card-icon">
              <CalendarDays size={19} />
            </span>

            <div>

              <span className="availability-section-kicker">
                Special dates
              </span>

              <h3>
                Add date exception
              </h3>

              <p>
                Block a date completely or replace your normal hours for that day.
              </p>

            </div>

          </div>


          <form
            className="override-pro-form"
            onSubmit={addOverride}
          >

            <label className="availability-field">

              <span>
                Date
              </span>

              <input
                name="booking_date"
                type="date"
                min={todayInput()}
                required
              />

            </label>


            <label className="availability-field">

              <span>
                Availability on this date
              </span>

              <select
                name="mode"
                value={overrideMode}
                onChange={(
                  event
                ) =>
                  setOverrideMode(
                    event.target
                      .value as
                      | "unavailable"
                      | "custom"
                  )
                }
              >

                <option value="unavailable">
                  Unavailable all day
                </option>

                <option value="custom">
                  Custom hours
                </option>

              </select>

            </label>


            {overrideMode ===
            "custom" && (

              <div className="override-pro-time-grid">

                <label className="availability-field">

                  <span>
                    Start time
                  </span>

                  <input
                    name="start_time"
                    type="time"
                    defaultValue="09:00"
                    required
                  />

                </label>


                <label className="availability-field">

                  <span>
                    End time
                  </span>

                  <input
                    name="end_time"
                    type="time"
                    defaultValue="17:00"
                    required
                  />

                </label>

              </div>

            )}


            <label className="availability-field">

              <span>
                Internal note
                <small>
                  Optional
                </small>
              </span>

              <input
                name="note"
                placeholder="Holiday, private event, shorter day..."
              />

            </label>


            <button
              className="availability-pro-primary availability-pro-wide"
              disabled={
                savingOverride
              }
            >

              {savingOverride ? (
                <>
                  <span className="availability-mini-spinner" />
                  Saving exception...
                </>
              ) : (
                <>
                  <CalendarDays size={16} />
                  Save date exception
                </>
              )}

            </button>

          </form>

        </section>


        {/* =============================================
            UPCOMING EXCEPTIONS
            ============================================= */}

        <section className="availability-pro-card">

          <div className="availability-pro-card-head">

            <span className="availability-pro-card-icon">
              <Clock3 size={19} />
            </span>

            <div>

              <span className="availability-section-kicker">
                Upcoming exceptions
              </span>

              <h3>
                Special-date schedule
              </h3>

              <p>
                These dates override your normal weekly availability.
              </p>

            </div>

          </div>


          {overrides.length ? (

            <div className="exceptions-pro-list">

              {overrides.map(
                (item) => (

                  <article
                    className="exception-pro-item"
                    key={item.id}
                  >

                    <div className="exception-pro-date-icon">

                      <span>
                        {new Date(
                          `${item.booking_date}T12:00:00`
                        )
                          .toLocaleDateString(
                            "en-US",
                            {
                              month:
                                "short",
                            }
                          )
                          .toUpperCase()}
                      </span>

                      <strong>
                        {item.booking_date
                          .split("-")[2]}
                      </strong>

                    </div>


                    <div className="exception-pro-copy">

                      <div className="exception-pro-title-row">

                        <strong>
                          {formatBookingDate(
                            item.booking_date
                          )}
                        </strong>

                        <span
                          className={
                            `exception-pro-badge ${
                              item.enabled
                                ? "custom"
                                : "blocked"
                            }`
                          }
                        >
                          {item.enabled
                            ? "Custom hours"
                            : "Unavailable"}
                        </span>

                      </div>


                      <span className="exception-pro-time">

                        {item.enabled
                          ? `${item.start_time} - ${item.end_time}`
                          : "Unavailable all day"}

                      </span>


                      {item.note && (

                        <small>
                          {item.note}
                        </small>

                      )}

                    </div>


                    <button
                      type="button"
                      className="exception-pro-remove"
                      onClick={() =>
                        removeOverride(
                          item.id
                        )
                      }
                      disabled={
                        removingId ===
                        item.id
                      }
                      aria-label="Remove date exception"
                    >

                      {removingId ===
                      item.id ? (
                        <span className="availability-mini-spinner dark-spinner" />
                      ) : (
                        <Trash2 size={16} />
                      )}

                      <span>
                        Remove
                      </span>

                    </button>

                  </article>

                )
              )}

            </div>

          ) : (

            <div className="availability-pro-empty">

              <CalendarDays size={28} />

              <strong>
                No special-date exceptions
              </strong>

              <p>
                Your normal weekly schedule currently applies to all upcoming dates.
              </p>

            </div>

          )}

        </section>

      </div>


      <div className="availability-pro-info">

        <CheckCircle2 size={18} />

        <p>
          Pending and confirmed bookings reserve their time window.
          Once a request is rejected or cancelled, that time becomes
          available again.
        </p>

      </div>

    </div>
  );
}