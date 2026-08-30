"use client";

/* HIREALOCALS SUPPORT REPORT EVIDENCE V72 */

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Image as ImageIcon,
  ShieldAlert,
} from "lucide-react";

import {
  authedFetch,
} from "@/lib/api";

import AdminShell from "@/components/AdminShell";


type Reply = {
  id: number;
  message: string;
  created_at: string;
  admin_name: string;
};


type Row = {
  id: number;
  reference: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  status: string;
  admin_note: string;
  assigned_user_id?: number | null;
  report_upload_id?: number | null;
  replies: Reply[];
};


export default function Page() {

  const [
    rows,
    setRows,
  ] = useState<Row[]>([]);

  const [
    selected,
    setSelected,
  ] =
    useState<number | null>(null);

  const [
    status,
    setStatus,
  ] =
    useState(
      "Loading support inbox..."
    );


  async function load() {

    const response =
      await authedFetch(
        "/api/admin/support"
      );

    const data =
      await response
        .json()
        .catch(() => []);


    if (!response.ok) {

      setStatus(
        data.detail ||
        "Could not load support inbox"
      );

      return;
    }


    setRows(data);

    setStatus("");


    const requested =
      typeof window !==
        "undefined"
        ? Number(
            new URLSearchParams(
              window.location.search
            ).get("id")
          )
        : 0;


    setSelected(
      current => {

        if (
          requested &&
          data.some(
            (row: Row) =>
              row.id === requested
          )
        ) {
          return requested;
        }


        if (
          current &&
          data.some(
            (row: Row) =>
              row.id === current
          )
        ) {
          return current;
        }


        return data[0]?.id ||
          null;
      }
    );
  }


  useEffect(() => {
    void load();
  }, []);


  const item =
    useMemo(
      () =>
        rows.find(
          row =>
            row.id === selected
        ) || null,
      [
        rows,
        selected,
      ]
    );


  async function update(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    if (!item) return;


    const form =
      new FormData(
        event.currentTarget
      );


    const response =
      await authedFetch(
        `/api/admin/support/${item.id}`,
        {
          method: "PATCH",

          body:
            JSON.stringify({
              status:
                String(
                  form.get(
                    "status"
                  )
                ),

              admin_note:
                String(
                  form.get(
                    "admin_note"
                  ) || ""
                ),
            }),
        }
      );


    if (response.ok) {
      await load();
    }
  }


  async function reply(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    if (!item) return;


    const form =
      event.currentTarget;

    const message =
      String(
        new FormData(
          form
        ).get("message") ||
        ""
      );


    const response =
      await authedFetch(
        `/api/admin/support/${item.id}/reply`,
        {
          method: "POST",

          body:
            JSON.stringify({
              message,
            }),
        }
      );


    if (response.ok) {

      form.reset();

      await load();
    }
  }


  async function viewEvidence(
    uploadId: number
  ) {

    setStatus(
      "Opening private screenshot..."
    );


    const response =
      await authedFetch(
        `/api/admin/uploads/${uploadId}/file`
      );


    if (!response.ok) {

      setStatus(
        "Could not open screenshot"
      );

      return;
    }


    const blob =
      await response.blob();

    const url =
      URL.createObjectURL(
        blob
      );


    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );


    window.setTimeout(
      () =>
        URL.revokeObjectURL(url),
      60000
    );


    setStatus("");
  }


  return (

    <AdminShell
      eyebrow="Customer care"
      title="Support inbox"
    >

      {status && (
        <div className="notice">
          {status}
        </div>
      )}


      <div className="support-shell">

        <div className="support-list">

          {rows.map(
            row => (

              <button
                key={row.id}
                className={
                  selected === row.id
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setSelected(row.id)
                }
              >

                <div>

                  <strong>
                    {row.subject}
                  </strong>

                  <span>
                    {row.name}
                    {" ? "}
                    {row.email}
                  </span>

                </div>


                <small
                  className={
                    `status ${row.status}`
                  }
                >
                  {row.status}
                </small>


                <em>
                  {row.reference}
                </em>

              </button>

            )
          )}

        </div>


        {item && (

          <div className="support-detail">

            <div className="admin-detail-head">

              <div>

                <span className="badge">
                  {item.reference}
                </span>


                {item.admin_note?.includes(
                  "[BOT TRIAGE PENDING]"
                ) && (

                  <span
                    className="badge badge-neutral"
                    style={{
                      marginLeft: 7,
                    }}
                  >
                    <ShieldAlert
                      size={12}
                    />
                    Bot triage pending
                  </span>

                )}


                <h3>
                  {item.subject}
                </h3>


                <p className="muted">

                  {item.name}
                  {" ? "}
                  {item.email}
                  {" ? "}
                  {new Date(
                    item.created_at
                  ).toLocaleString()}

                </p>

              </div>

            </div>


            {item.report_upload_id && (

              <div className="notice">

                <strong>
                  Report evidence attached
                </strong>

                <p
                  className="muted"
                  style={{
                    marginTop: 4,
                  }}
                >
                  Private screenshot submitted with this conversation report.
                </p>

                <button
                  type="button"
                  className="mini-btn"
                  style={{
                    marginTop: 8,
                  }}
                  onClick={() =>
                    viewEvidence(
                      item.report_upload_id!
                    )
                  }
                >
                  <ImageIcon size={15} />
                  View private screenshot
                </button>

              </div>

            )}


            <div className="support-original">

              <strong>
                Customer message
              </strong>

              <p
                style={{
                  whiteSpace:
                    "pre-wrap",
                }}
              >
                {item.message}
              </p>

            </div>


            {item.replies.length >
              0 && (

              <div className="support-replies">

                {item.replies.map(
                  row => (

                    <article key={row.id}>

                      <strong>
                        {row.admin_name}
                      </strong>

                      <p>
                        {row.message}
                      </p>

                      <small>
                        {new Date(
                          row.created_at
                        ).toLocaleString()}
                      </small>

                    </article>

                  )
                )}

              </div>

            )}


            <form
              className="form-box"
              onSubmit={reply}
            >

              <label>
                Reply by email
              </label>

              <textarea
                name="message"
                rows={5}
                required
              />

              <button className="btn">
                Send reply
              </button>

            </form>


            <form
              className="form-box"
              onSubmit={update}
            >

              <div className="form-grid">

                <div className="form-group">

                  <label>
                    Status
                  </label>

                  <select
                    name="status"
                    defaultValue={
                      item.status
                    }
                    key={
                      `${item.id}-status`
                    }
                  >
                    <option value="open">
                      Open
                    </option>

                    <option value="pending">
                      Waiting / pending
                    </option>

                    <option value="closed">
                      Closed
                    </option>
                  </select>

                </div>


                <div className="form-group full">

                  <label>
                    Internal admin note
                  </label>

                  <textarea
                    name="admin_note"
                    rows={3}
                    defaultValue={
                      item.admin_note
                    }
                    key={
                      `${item.id}-note`
                    }
                  />

                </div>

              </div>


              <button className="btn secondary">
                Save support state
              </button>

            </form>

          </div>

        )}

      </div>

    </AdminShell>
  );
}
