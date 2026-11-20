import { useId } from 'react';

interface Props {
  label: string;
  /** 이름 아래 작은 설명(예: "최소 버전 미만 앱의 모든 요청을 즉시 거부합니다") */
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** 켜면 사용자를 막는 스위치는 켜졌을 때 빨갛게 */
  danger?: boolean;
}

/** 켜고 끄는 스위치: 이름 · 설명은 왼쪽, 스위치는 오른쪽(D6). 바꾼 값은 "저장" 을 눌러야 서버에 간다. */
export function Switch({ label, help, checked, onChange, disabled, danger }: Props) {
  const helpId = useId();
  return (
    <label className={danger ? 'switch switch--danger' : 'switch'}>
      <input
        type="checkbox"
        role="switch"
        className="switch__input"
        aria-label={label}
        aria-describedby={help ? helpId : undefined}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch__text" aria-hidden="true">
        <span className="switch__label">{label}</span>
        {help && (
          <span className="switch__help" id={helpId}>
            {help}
          </span>
        )}
      </span>
      <span className="switch__track" aria-hidden="true" />
    </label>
  );
}
