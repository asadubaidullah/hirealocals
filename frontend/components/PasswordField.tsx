"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes
} from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps =
  Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    label:string;
    hint?:string;
  };

const PasswordField = forwardRef<HTMLInputElement,PasswordFieldProps>(
  function PasswordField(
    {
      label,
      hint,
      id,
      className="",
      ...props
    },
    ref
  ){
    const autoId=useId();
    const inputId=id||autoId;
    const [visible,setVisible]=useState(false);

    return (
      <div className="form-group password-field-group">

        <label htmlFor={inputId}>
          {label}
        </label>

        <div className="password-field-shell">

          <input
            {...props}
            ref={ref}
            id={inputId}
            type={visible?"text":"password"}
            className={`password-field-input ${className}`}
          />

          <button
            type="button"
            className="password-eye-button"
            aria-label={visible?"Hide password":"Show password"}
            aria-pressed={visible}
            title={visible?"Hide password":"Show password"}
            onClick={()=>setVisible(current=>!current)}
          >
            {visible ?
               <EyeOff size={19} strokeWidth={2}/>
              : <Eye size={19} strokeWidth={2}/>
            }
          </button>

        </div>

        {hint ?
           <span className="password-field-hint">
              {hint}
            </span>
          : null
        }

      </div>
    );
  }
);

export default PasswordField;

