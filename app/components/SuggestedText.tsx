import { useHydrated } from "remix-utils";

export default function SuggestedText({
  text,
  currentText,
  onClick,
  label,
}: {
  text: string | null | undefined;
  currentText: string | null | undefined;
  onClick: (text: string) => void;
  label: string;
}) {
  if (!useHydrated()) return null;
  if (currentText) return null;
  if (!text) return null;
  return (
    <details>
      <summary>
        <small>Suggested {label}</small>
      </summary>
      <p>
        <em>{text}</em>
      </p>
      <button type="button" onClick={() => onClick(text)}>
        💁 Use suggested {label}
      </button>
    </details>
  );
}
