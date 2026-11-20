import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useIsPhone } from './overlay';

export interface Column<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  className?: string;
}

/** 줄을 눌렀을 때 갈 곳. state 는 상세에서 돌아올 때 쓸 지금 조건 등. */
export interface RowLink {
  to: string;
  state?: unknown;
}

interface Props<Row> {
  /** 읽어 주는 이름(표 · 카드 목록) */
  label: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** 폰의 카드 한 장 */
  card: (row: Row) => ReactNode;
  rowLink?: (row: Row) => RowLink;
  /** 링크를 거는 칸(키보드 · 읽어 주기용). 줄 어디를 눌러도 간다. */
  linkColumn?: string;
}

/** 표(결정 003 의 6): 모든 칸 가운데 정렬, 폰(640 아래)은 카드 목록. 줄을 누르면 상세로. */
export function Table<Row>({ label, columns, rows, rowKey, card, rowLink, linkColumn }: Props<Row>) {
  const phone = useIsPhone();
  const navigate = useNavigate();

  if (phone) {
    return (
      <ul className="stack" aria-label={label}>
        {rows.map((row) => {
          const link = rowLink?.(row);
          return (
            <li key={rowKey(row)}>
              {link ? (
                <Link className="card row-card" to={link.to} state={link.state}>
                  {card(row)}
                </Link>
              ) : (
                <div className="card row-card">{card(row)}</div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="table-wrap">
      <table className="tbl" aria-label={label}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const link = rowLink?.(row);
            return (
              <tr key={rowKey(row)} className={link ? 'is-link' : undefined} onClick={link ? () => navigate(link.to, { state: link.state }) : undefined}>
                {columns.map((c) => (
                  <td key={c.key} className={c.className}>
                    {link && c.key === linkColumn ? (
                      <Link to={link.to} state={link.state} onClick={(e) => e.stopPropagation()}>
                        {c.render(row)}
                      </Link>
                    ) : (
                      c.render(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
