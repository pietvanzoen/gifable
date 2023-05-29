import { useIsSubmitting } from "remix-validated-form";

type SubmitButtonProps = {
  formId?: string;
  children?: React.ReactNode;
  submitText?: string;
};

export default function SubmitButton({
  formId,
  children,
  submitText = "Submitting...",
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
      {isSubmitting ? submitText : children || "Submit"}
    </button>
  );
}
