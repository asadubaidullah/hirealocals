"use client";
import TwoFactorEmailBackup from "@/components/TwoFactorEmailBackup";

import {
  useEffect,
  useState,
} from "react";

import {
  authedFetch,
} from "@/lib/api";


type SecurityStatus = {
  enabled: boolean;
  configured: boolean;
  recovery_codes_remaining: number;
};


type SetupResult = {
  secret: string;
  otpauth_uri: string;
  qr_svg: string;
};


export default function TwoFactorCard() {

  const [
    security,
    setSecurity,
  ] = useState<SecurityStatus | null>(
    null
  );


  const [
    setup,
    setSetup,
  ] = useState<SetupResult | null>(
    null
  );


  const [
    password,
    setPassword,
  ] = useState("");


  const [
    code,
    setCode,
  ] = useState("");


  const [
    busy,
    setBusy,
  ] = useState(false);


  const [
    message,
    setMessage,
  ] = useState("");


  const [
    recoveryCodes,
    setRecoveryCodes,
  ] = useState<string[]>([]);


  async function load() {

    const response =
      await authedFetch(
        "/api/auth/2fa/status"
      );


    const data =
      await response
        .json()
        .catch(() => ({}));


    if (!response.ok) {

      setMessage(
        data.detail
        || "Could not load security settings."
      );

      return;
    }


    setSecurity(
      data
    );
  }


  useEffect(() => {

    load();

  }, []);


  async function startSetup() {

    if (
      busy
      || !password
    ) {
      return;
    }


    setBusy(true);

    setMessage("");

    setRecoveryCodes([]);


    try {

      const response =
        await authedFetch(
          "/api/auth/2fa/setup",
          {
            method: "POST",
            body: JSON.stringify({
              password,
            }),
          }
        );


      const data =
        await response
          .json()
          .catch(() => ({}));


      if (!response.ok) {

        throw new Error(
          data.detail
          || "Could not start 2FA setup."
        );
      }


      setSetup(
        data
      );

      setCode("");

      setMessage(
        "Scan the QR code and enter the 6-digit code from your authenticator app."
      );

    }
    catch (error: any) {

      setMessage(
        error?.message
        || "Could not start 2FA setup."
      );

    }
    finally {

      setBusy(false);
    }
  }


  async function enable() {

    if (
      busy
      || !password
      || code.trim().length !== 6
    ) {
      return;
    }


    setBusy(true);

    setMessage("");


    try {

      const response =
        await authedFetch(
          "/api/auth/2fa/enable",
          {
            method: "POST",
            body: JSON.stringify({
              password,
              code:
                code.trim(),
            }),
          }
        );


      const data =
        await response
          .json()
          .catch(() => ({}));


      if (!response.ok) {

        throw new Error(
          data.detail
          || "Could not enable 2FA."
        );
      }


      const codes =
        Array.isArray(
          data.recovery_codes
        )
          ? data.recovery_codes
          : [];


      setRecoveryCodes(
        codes
      );


      setSecurity({
        enabled:
          true,

        configured:
          true,

        recovery_codes_remaining:
          codes.length,
      });


      setSetup(null);

      setPassword("");

      setCode("");

      setMessage(
        "Two-factor authentication is now enabled."
      );

    }
    catch (error: any) {

      setMessage(
        error?.message
        || "Could not enable 2FA."
      );

    }
    finally {

      setBusy(false);
    }
  }


  async function secureAction(
    endpoint: string,
  ) {

    if (
      busy
      || !password
      || code.trim().length < 6
    ) {
      return;
    }


    setBusy(true);

    setMessage("");


    try {

      const response =
        await authedFetch(
          endpoint,
          {
            method: "POST",
            body: JSON.stringify({
              password,
              code:
                code.trim(),
            }),
          }
        );


      const data =
        await response
          .json()
          .catch(() => ({}));


      if (!response.ok) {

        throw new Error(
          data.detail
          || "Security action failed."
        );
      }


      if (
        endpoint.endsWith(
          "/disable"
        )
      ) {

        setSecurity({
          enabled:
            false,

          configured:
            false,

          recovery_codes_remaining:
            0,
        });


        setSetup(null);

        setRecoveryCodes([]);

        setMessage(
          "Two-factor authentication has been disabled."
        );

      }
      else {

        const codes =
          Array.isArray(
            data.recovery_codes
          )
            ? data.recovery_codes
            : [];


        setRecoveryCodes(
          codes
        );


        setSecurity(
          previous =>
            previous
              ? {
                  ...previous,
                  recovery_codes_remaining:
                    codes.length,
                }
              : previous
        );


        setMessage(
          "New recovery codes generated. All previous recovery codes are now invalid."
        );
      }


      setPassword("");

      setCode("");

    }
    catch (error: any) {

      setMessage(
        error?.message
        || "Security action failed."
      );

    }
    finally {

      setBusy(false);
    }
  }


  async function copyRecoveryCodes() {

    if (!recoveryCodes.length) {
      return;
    }


    await navigator.clipboard.writeText(
      recoveryCodes.join("\n")
    );


    setMessage(
      "Recovery codes copied."
    );
  }


  if (!security) {

    return (

      <section className="form-box hal-two-factor-card">

        <span className="eyebrow">
          Security
        </span>

        <h3>
          Two-factor authentication
        </h3>

        <p className="muted">
          Loading security settings...
        </p>

      </section>

    );
  }


  return (

    <section className="form-box hal-two-factor-card">


      <div className="hal-two-factor-head">

        <div>

          <span className="eyebrow">
            Security
          </span>

          <h3>
            Two-factor authentication
          </h3>

          <p className="muted">
            Require an authenticator or recovery
            code after your password at login.
          </p>

        </div>


        <span
          className={
            `hal-two-factor-status ${
              security.enabled
                ? "enabled"
                : "disabled"
            }`
          }
        >
          {security.enabled
            ? "Enabled"
            : "Off"
          }
        </span>

      </div>


      <TwoFactorEmailBackup />

      {!security.enabled
      && !setup && (

        <div className="hal-two-factor-off">

          <div className="hal-two-factor-shield">
            2FA
          </div>


          <div>

            <strong>
              Protect your Local account
            </strong>

            <p>
              Your password remains the first step.
              A second verification code will be
              required before a login token is issued.
            </p>

          </div>


          <div className="hal-two-factor-enable">

            <input
              type="password"
              value={password}
              onChange={
                event =>
                  setPassword(
                    event.target.value
                  )
              }
              placeholder="Current password"
              autoComplete="current-password"
            />

            <button
              type="button"
              className="btn"
              disabled={
                busy
                || !password
              }
              onClick={startSetup}
            >
              {busy
                ? "Checking..."
                : "Enable 2FA"
              }
            </button>

          </div>

        </div>

      )}


      {!security.enabled
      && setup && (

        <div className="hal-two-factor-setup">

          <div className="hal-two-factor-qr">

            <div
              dangerouslySetInnerHTML={{
                __html:
                  setup.qr_svg,
              }}
            />

          </div>


          <div className="hal-two-factor-setup-content">

            <strong>
              Scan the QR code
            </strong>

            <p>
              Use Google Authenticator,
              Microsoft Authenticator,
              Authy or another TOTP-compatible app.
            </p>


            <div className="hal-two-factor-secret">

              <span>
                Manual setup key
              </span>

              <code>
                {setup.secret}
              </code>

            </div>


            <div className="form-group">

              <label>
                6-digit authenticator code
              </label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={
                  event =>
                    setCode(
                      event.target.value
                    )
                }
                placeholder="123456"
                maxLength={6}
              />

            </div>


            <div className="hal-two-factor-actions">

              <button
                type="button"
                className="btn"
                disabled={
                  busy
                  || code.trim().length !== 6
                }
                onClick={enable}
              >
                {busy
                  ? "Enabling..."
                  : "Confirm & enable"
                }
              </button>


              <button
                type="button"
                className="btn secondary"
                disabled={busy}
                onClick={() => {
                  setSetup(null);
                  setCode("");
                  setPassword("");
                  setMessage("");
                }}
              >
                Cancel
              </button>

            </div>

          </div>

        </div>

      )}


      {security.enabled && (

        <div className="hal-two-factor-enabled">

          <div className="hal-two-factor-protected">

            <span>
              ?
            </span>

            <div>

              <strong>
                Account protected
              </strong>

              <p>
                Password-only login cannot issue
                an access token while 2FA is enabled.
              </p>

            </div>

          </div>


          

          <div className="hal-two-factor-recovery-count">

            <span>
              Recovery codes remaining
            </span>

            <strong>
              {
                security
                  .recovery_codes_remaining
              }
            </strong>

          </div>


          <div className="hal-two-factor-secure-fields">

            <div className="form-group">

              <label>
                Current password
              </label>

              <input
                type="password"
                value={password}
                onChange={
                  event =>
                    setPassword(
                      event.target.value
                    )
                }
                autoComplete="current-password"
              />

            </div>


            <div className="form-group">

              <label>
                Authenticator code
              </label>

              <input
                type="text"
                value={code}
                onChange={
                  event =>
                    setCode(
                      event.target.value
                    )
                }
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={40}
              />

            </div>

          </div>


          <div className="hal-two-factor-actions">

            <button
              type="button"
              className="btn secondary"
              disabled={
                busy
                || !password
                || code.trim().length < 6
              }
              onClick={() =>
                secureAction(
                  "/api/auth/2fa/recovery-codes"
                )
              }
            >
              New recovery codes
            </button>


            <button
              type="button"
              className="btn hal-two-factor-danger"
              disabled={
                busy
                || !password
                || code.trim().length < 6
              }
              onClick={() =>
                secureAction(
                  "/api/auth/2fa/disable"
                )
              }
            >
              Disable 2FA
            </button>

          </div>

        </div>

      )}


      {recoveryCodes.length > 0 && (

        <div className="hal-two-factor-recovery-box">

          <div className="hal-two-factor-recovery-head">

            <div>

              <strong>
                Save these recovery codes
              </strong>

              <p>
                Each code works once. They will
                not be displayed again after
                leaving this screen.
              </p>

            </div>


            <button
              type="button"
              className="btn secondary"
              onClick={copyRecoveryCodes}
            >
              Copy
            </button>

          </div>


          <div className="hal-two-factor-recovery-grid">

            {
              recoveryCodes.map(
                item => (

                  <code key={item}>
                    {item}
                  </code>

                )
              )
            }

          </div>

        </div>

      )}


      {message && (

        <div className="notice hal-two-factor-message">
          {message}
        </div>

      )}

    </section>

  );
}

