interface Props<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** 칸 고르기(예: 답변 대기 · 답변 완료 · 전체). 폰에서는 한 줄을 꽉 채운다. */
export function Segmented<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <span className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="seg__item" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </span>
  );
}
