import FormInput from "./FormInput";

export default function MediaCommentInput({
  terms,
}: {
  terms: [string, number][];
}) {
  const termsList = terms.map(([term]) => `'${term}'`).join(", ");
  return (
    <FormInput
      type="textarea"
      help={`Add a comma separated list of terms for searching. Some common terms are: ${termsList}`}
      name="comment"
      label="Search comment"
    />
  );
}
