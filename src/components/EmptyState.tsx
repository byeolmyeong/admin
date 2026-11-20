import { strings } from '../content/strings';
import { Icon } from './icons';
import type { IconName } from './icons';

interface Props {
  title: string;
  body?: string;
  icon?: IconName;
  /** 찾기 · 거르기로 비었을 때만 준다 — "검색 · 필터 초기화" 버튼(결정 003 의 6) */
  onReset?: () => void;
}

/** 비었을 때: 처음부터 비면 안내만, 찾기 · 거르기로 비면 초기화 버튼(D25 · D25-1). */
export function EmptyState({ title, body, icon = 'inbox', onReset }: Props) {
  return (
    <div className="card empty">
      <span className="empty__icon" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <p className="empty__title">{title}</p>
      {body && <p className="empty__body">{body}</p>}
      {onReset && (
        <button type="button" className="btn btn--secondary" onClick={onReset}>
          {strings.empty.reset}
        </button>
      )}
    </div>
  );
}
