import { strings } from '../content/strings';
import { PAGE_SIZES, pageCountOf, pageGroup } from '../lib/pages';
import { Icon } from './icons';
import { Select } from './Select';

const t = strings.pager;
const SIZE_OPTIONS = PAGE_SIZES.map((n) => ({ value: String(n), label: t.size(n) }));

interface Props {
  total: number;
  /** 0 부터 */
  page: number;
  size: number;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
  /** 왼쪽 글(기본 "7개 중 1–7"). 감사 로그처럼 앞에 말을 붙일 때 바꾼다. */
  range?: string;
}

/** 페이지 번호(결정 003 의 5): 10개 한 묶음, ‹ › 는 이전 · 다음 묶음(첫 묶음의 ‹ 는 흐림), 오른쪽 "20개씩". */
export function Pager({ total, page, size, onPage, onSize, range }: Props) {
  const group = pageGroup(page, pageCountOf(total, size));
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  return (
    <div className="pager">
      <span className="pager__range">{range ?? t.range(total, from, to)}</span>
      <nav className="pager__pages" aria-label={t.label}>
        <button type="button" className="pager__button" aria-label={t.prevGroup} disabled={group.prev === null} onClick={() => group.prev !== null && onPage(group.prev)}>
          <Icon name="left" size={16} />
        </button>
        {group.pages.map((p) => (
          <button
            key={p}
            type="button"
            className={p === page ? 'pager__button is-current' : 'pager__button'}
            aria-label={t.page(p + 1)}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPage(p)}
          >
            {p + 1}
          </button>
        ))}
        <button type="button" className="pager__button" aria-label={t.nextGroup} disabled={group.next === null} onClick={() => group.next !== null && onPage(group.next)}>
          <Icon name="right" size={16} />
        </button>
      </nav>
      <span className="pager__size">
        <Select ariaLabel={t.sizeLabel} value={String(size)} defaultValue={String(size)} options={SIZE_OPTIONS} align="end" onChange={(v) => v !== '' && onSize(Number(v))} />
      </span>
    </div>
  );
}
