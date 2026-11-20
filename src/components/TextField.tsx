import { useId } from 'react';
import { strings } from '../content/strings';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password';
  /** 여러 줄 입력 */
  multiline?: boolean;
  rows?: number;
  help?: string;
  error?: string | null;
  /** 글자 수(코드 포인트)와 한도. 넘으면 빨갛게 보인다. */
  counter?: { count: number; max: number };
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
}

/** 라벨은 위, 도움말·오류·글자 수는 아래인 입력칸(앱 결정 018 의 채운 입력칸). */
export function TextField({ label, value, onChange, type = 'text', multiline, rows = 4, help, error, counter, autoComplete, placeholder, disabled }: Props) {
  const id = useId();
  const describedBy = [help && `${id}-help`, error && `${id}-error`, counter && `${id}-count`].filter(Boolean).join(' ');
  const shared = {
    id,
    value,
    disabled,
    placeholder,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  };
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} className="input input--multiline" rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...shared} className="input" type={type} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
      )}
      <div className="field__foot">
        <div>
          {help && (
            <p className="field__help" id={`${id}-help`}>
              {help}
            </p>
          )}
          {error && (
            <p className="field__error" id={`${id}-error`} role="alert">
              {error}
            </p>
          )}
        </div>
        {counter && (
          <p className={counter.count > counter.max ? 'field__count field__count--over' : 'field__count'} id={`${id}-count`}>
            {strings.common.counter(counter.count, counter.max)}
          </p>
        )}
      </div>
    </div>
  );
}
