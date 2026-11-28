import { useEffect, useRef, useState } from 'react';
import { strings } from '../content/strings';
import { Icon } from './icons';

interface Props {
  label: string;
  placeholder: string;
  /** 지금 적용된 찾기 값(주소에 있는 값, 앞뒤 공백 없음) */
  value: string;
  /** 입력을 멈추고 0.3초 뒤, 또는 ✕ 로 지울 때 앞뒤 공백을 뗀 값으로 부른다 */
  onCommit: (value: string) => void;
}

const DELAY = 300;

/** 찾기 칸(결정 003 의 5): 입력을 멈추고 0.3초 뒤에 찾고, 칸 오른쪽 ✕ 로 지운다. */
export function SearchField({ label, placeholder, value, onCommit }: Props) {
  const [draft, setDraft] = useState(value);
  // 알린 값은 앞뒤 공백을 뗀 값이다. 부모가 주소에 넣는 값과 같아야 적는 중인 띄어쓰기("로그인 ")를 바깥 변화로 보지 않는다.
  const committed = useRef(value.trim());

  // 바깥에서 값이 바뀌면(초기화 등) 칸도 따라간다.
  useEffect(() => {
    if (value.trim() !== committed.current) {
      committed.current = value.trim();
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    const next = draft.trim();
    if (next === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = next;
      onCommit(next);
    }, DELAY);
    return () => clearTimeout(timer);
  }, [draft, onCommit]);

  return (
    <span className="search">
      <Icon name="search" size={16} />
      <input type="search" className="search__input" aria-label={label} placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} />
      {draft !== '' && (
        <button
          type="button"
          className="search__clear"
          aria-label={strings.search.clear}
          onClick={() => {
            setDraft('');
            committed.current = '';
            onCommit('');
          }}
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </span>
  );
}
