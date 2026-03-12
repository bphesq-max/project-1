type SubmissionSubmitterFieldsProps = {
  prefix: string;
  nameValue: string;
  emailValue: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
};

export default function SubmissionSubmitterFields({
  prefix,
  nameValue,
  emailValue,
  onNameChange,
  onEmailChange,
}: SubmissionSubmitterFieldsProps) {
  return (
    <div className="form-row">
      <div className="form-group">
        <label htmlFor={`${prefix}-submit-name`}>Your name</label>
        <input
          id={`${prefix}-submit-name`}
          value={nameValue}
          onChange={(event) => onNameChange(event.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${prefix}-submit-email`}>Your email</label>
        <input
          id={`${prefix}-submit-email`}
          type="email"
          value={emailValue}
          onChange={(event) => onEmailChange(event.target.value)}
          required
        />
      </div>
    </div>
  );
}
