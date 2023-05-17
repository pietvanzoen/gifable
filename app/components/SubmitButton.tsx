import { useIsSubmitting } from "remix-validated-form";

type SubmitButtonProps = {
  formId?: string;
  children?: React.ReactNode;
};

export default function SubmitButton({
  formId,
  children,
  ...buttonProps
}: SubmitButtonProps = {}) {
  const isSubmitting = useIsSubmitting(formId);
  return (
    <button
      form={formId}
      type="submit"
      disabled={isSubmitting}
      {...buttonProps}
    >
      {isSubmitting ? "Submitting..." : children || "Submit"}
    </button>
  );
}
