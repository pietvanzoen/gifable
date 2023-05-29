import FormInput from "./FormInput";

export default function MediaLabelsInput({
  terms,
  defaultValue,
}: {
  terms: [string, number][];
  defaultValue?: string;
}) {
  const termsList = terms.map(([term]) => `'${term}'`).join(", ");
  return (
    <FormInput
      type="textarea"
      help={`Add a comma separated list of labels for searching. Some common terms are: ${termsList}`}
      name="labels"
      defaultValue={defaultValue}
      label="Search labels"
    />
  );
}
