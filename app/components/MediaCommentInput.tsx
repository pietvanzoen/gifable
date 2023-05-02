import FormInput from "./FormInput";

export default function MediaCommentInput({
  terms,
}: {
  terms: [string, number][];
}) {
  const termsList = terms
    .filter(([term]) => term.split(" ").length === 1)
    .sort(() => 0.5 - Math.random())
    .map(([term]) => `'${term}'`)
    .join(", ");
  return (
    <FormInput
      type="textarea"
      help={`Add a comma separated list of terms for searching. Some common terms are: ${termsList}`}
      name="comment"
      label="Search comment"
    />
  );
}
