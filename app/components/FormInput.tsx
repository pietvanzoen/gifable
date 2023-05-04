import classNames from "classnames";
import type { ChangeEventHandler, FocusEventHandler } from "react";
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
  style?: React.CSSProperties;
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  autoComplete?: string;
  defaultValue?: string;
  onBlur?: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
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
  style,
  ...inputProps
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
        {...inputProps}
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
