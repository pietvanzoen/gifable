import { useIsSubmitting } from "remix-validated-form";

type SubmitButtonProps = {
  formId?: string;
  children?: React.ReactNode;
};

export default function SubmitButton({
  formId,
  children,
}: SubmitButtonProps = {}) {
  const isSubmitting = useIsSubmitting(formId);
  return (
    <button form={formId} type="submit" disabled={isSubmitting}>
      {isSubmitting ? "Submitting..." : children || "Submit"}
    </button>
  );
}
