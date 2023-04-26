import classNames from "classnames";
import type { ChangeEventHandler } from "react";
import { useField } from "remix-validated-form";

export type FormInputProps = {
  label?: string;
  help?: string;
  name: string;
  value?: string;
  type?: "text" | "password" | "radio" | "hidden" | "textarea" | "file";
  checked?: boolean;
  options?: { value: string; label: string }[];
  required?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  style?: React.CSSProperties;
};

export default function FormInput({
  name,
  label,
  help,
  type = "text",
  value,
  checked,
  required,
  onChange,
  style,
}: FormInputProps) {
  const { error, getInputProps } = useField(name);
  let fieldId = name;
  if (type === "radio") {
    fieldId = `${name}-${value}`;
  }

  const Tag = type === "textarea" ? "textarea" : "input";

  return (
    <div
      className={classNames(
        "field",
        `field--${type}`,
        required && "field--required"
      )}
      style={style}
    >
      {!["hidden", "radio"].includes(type) && label && (
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
        checked={type === "radio" ? checked : undefined}
        onChange={onChange}
      />
      {["radio"].includes(type) && (
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
