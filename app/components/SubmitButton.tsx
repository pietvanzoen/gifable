import { useIsSubmitting } from "remix-validated-form";

type SubmitButtonProps = {
  formId?: string;
};

export default function SubmitButton({ formId }: SubmitButtonProps = {}) {
  const isSubmitting = useIsSubmitting(formId);
  return (
    <button form={formId} type="submit" disabled={isSubmitting}>
      {isSubmitting ? "Submitting..." : "Submit"}
    </button>
  );
}
