"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  authedFetch,
} from "@/lib/api";


type State = {
  enabled:boolean;
  available:boolean;
  email_verified:boolean;
  masked_email:string;
};


export default function TwoFactorEmailBackup(){

  const [state,setState] =
    useState<State|null>(null);

  const [password,setPassword] =
    useState("");

  const [managing,setManaging] =
    useState(false);

  const [busy,setBusy] =
    useState(false);

  const [message,setMessage] =
    useState("");


  async function load(){

    const r =
      await authedFetch(
        "/api/auth/2fa/email/status"
      );

    const d =
      await r.json().catch(()=>({}));

    if(r.ok){
      setState(d);
    }else{
      setMessage(
        d.detail ||
        "Could not load Email 2FA."
      );
    }
  }


  useEffect(()=>{
    load();
  },[]);


  async function update(){

    if(
      !state ||
      busy ||
      !password
    ){
      return;
    }

    setBusy(true);
    setMessage("");

    try{

      const endpoint =
        state.enabled
          ? "/api/auth/2fa/email/disable"
          : "/api/auth/2fa/email/enable";

      const r =
        await authedFetch(
          endpoint,
          {
            method:"POST",
            body:JSON.stringify({
              password
            }),
          }
        );

      const d =
        await r.json().catch(()=>({}));

      if(!r.ok){
        throw new Error(
          d.detail ||
          "Could not update Email 2FA."
        );
      }

      const wasEnabled =
        state.enabled;

      setPassword("");
      setManaging(false);

      await load();

      setMessage(
        wasEnabled
          ? "Email 2FA disabled."
          : "Email 2FA enabled."
      );

    }catch(error:any){

      setMessage(
        error?.message ||
        "Could not update Email 2FA."
      );

    }finally{
      setBusy(false);
    }
  }


  if(!state){

    return(
      <div className="hal-email-otp-card">
        Loading Email 2FA...
      </div>
    );
  }


  return(

    <section className="hal-email-otp-card">

      <div className="hal-email-otp-row">

        <div className="hal-email-otp-icon">
          @
        </div>

        <div className="hal-email-otp-copy">

          <strong>
            Email verification code
          </strong>

          <span>
            Independent 2FA method
            {" ? "}
            {state.masked_email}
          </span>

        </div>

        <span
          className={
            `hal-email-otp-badge ${
              state.enabled
                ? "enabled"
                : ""
            }`
          }
        >
          {state.enabled
            ? "Enabled"
            : "Off"
          }
        </span>

        <button
          type="button"
          className="mini-btn"
          disabled={!state.email_verified}
          onClick={()=>
            setManaging(v=>!v)
          }
        >
          {managing
            ? "Cancel"
            : state.enabled
              ? "Manage"
              : "Enable"
          }
        </button>

      </div>


      {!state.email_verified && (

        <div className="hal-email-otp-warning">
          Verify your account email first.
        </div>

      )}


      {managing
      && state.email_verified && (

        <div className="hal-email-otp-manage">

          <p>
            Confirm your current password
            to change this security method.
          </p>

          <div className="form-group">

            <label>
              Current password
            </label>

            <input
              type="password"
              value={password}
              onChange={
                e=>setPassword(
                  e.target.value
                )
              }
              autoComplete="current-password"
            />

          </div>

          <button
            type="button"
            className={
              state.enabled
                ? "btn hal-email-otp-danger"
                : "btn"
            }
            disabled={
              busy ||
              !password
            }
            onClick={update}
          >
            {busy
              ? "Updating..."
              : state.enabled
                ? "Disable Email 2FA"
                : "Enable Email 2FA"
            }
          </button>

        </div>

      )}


      {message && (
        <small className="hal-email-otp-message">
          {message}
        </small>
      )}

    </section>
  );
}
