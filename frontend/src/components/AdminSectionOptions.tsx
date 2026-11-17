type Props<T extends string> = {
  label: string;
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
};

export default function AdminSectionOptions<T extends string>({
  label, options, value, onChange,
}: Props<T>) {
  return (
    <div className="admin-section-options" role="group" aria-label={label}>
      {options.map(({ id, label: optionLabel }) => (
        <button
          key={id}
          type="button"
          aria-pressed={id === value}
          onClick={() => onChange(id)}
        >
          {optionLabel}
        </button>
      ))}
    </div>
  );
}
