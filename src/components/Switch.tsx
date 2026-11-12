interface Props {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** 켜면 사용자를 막는 스위치는 켜졌을 때 빨갛게 */
  danger?: boolean;
}

/** 켜고 끄는 스위치. 바꾼 값은 "저장" 을 눌러야 서버에 간다. */
export function Switch({ label, checked, onChange, disabled, danger }: Props) {
  return (
    <label className={danger ? 'switch switch--danger' : 'switch'}>
      <input type="checkbox" role="switch" className="switch__input" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch__track" aria-hidden="true" />
      <span className="switch__label">{label}</span>
    </label>
  );
}
