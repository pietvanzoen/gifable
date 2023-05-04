import classNames from "classnames";
import type { ChangeEventHandler } from "react";
import { useField } from "remix-validated-form";

export type FormInputProps = {
  label?: string;
  help?: string;
  name: string;
  value?: string;
  variant?: "tag";
  type?:
    | "text"
    | "url"
    | "password"
    | "radio"
    | "hidden"
    | "textarea"
    | "file"
    | "checkbox";
  checked?: boolean;
  options?: { value: string; label: string }[];
  required?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  style?: React.CSSProperties;
  autoComplete?: string;
};

export default function FormInput({
  name,
  variant,
  label,
  help,
  type = "text",
  value,
  checked,
  required,
  onChange,
  style,
  autoComplete,
}: FormInputProps) {
  const { error, getInputProps } = useField(name);
  let fieldId = name;
  if (["radio", "checkbox"].includes(type)) {
    fieldId = `${name}-${value}`;
  }

  const Tag = type === "textarea" ? "textarea" : "input";

  return (
    <div
      className={classNames(
        "field",
        `field--${type}`,
        required && "field--required",
        variant ? "field--" + variant : ""
      )}
      style={style}
    >
      {!["hidden", "radio", "checkbox"].includes(type) && label && (
        <label htmlFor={fieldId}>
          <span className="field-label">{label}</span>{" "}
          {help && <div className="field-help">{help}</div>}
        </label>
      )}
      <Tag
        {...getInputProps({ id: fieldId, type, value, required })}
        aria-invalid={Boolean(error)}
        className={error ? "field-error" : ""}
        aria-errormessage={error ? `${fieldId}-error` : undefined}
        defaultChecked={
          ["checkbox", "radio"].includes(type) ? checked : undefined
        }
        onChange={onChange}
        autoComplete={autoComplete}
      />
      {["radio", "checkbox"].includes(type) && (
        <label htmlFor={fieldId} className="field-label">
          &nbsp;{label}
        </label>
      )}
      {error && (
        <div id={`${fieldId}-error`}>
          <small className="error">{error}</small>
        </div>
      )}
    </div>
  );
}
