import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { strings } from '../content/strings';
import { ConfirmDialog } from './ConfirmDialog';
import { DateRangeSelect } from './DateRangeSelect';
import { EmptyState } from './EmptyState';
import { MoreMenu } from './MoreMenu';
import { Pager } from './Pager';
import { SearchField } from './SearchField';
import { Select } from './Select';
import { Table } from './Table';
import { UiProvider } from './UiProvider';
import { useToast } from './Toast';
import type { DateRange } from '../lib/dates';

const ui = (node: ReactNode) =>
  render(
    <MemoryRouter>
      <UiProvider>{node}</UiProvider>
    </MemoryRouter>,
  );

/** 폰 폭(640 아래)인 척한다 */
const phone = () =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: query.includes('639'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const KINDS = [
  { value: 'KAKAO', label: '카카오' },
  { value: 'APPLE', label: 'Apple' },
];
const SIZES = [
  { value: '10', label: '10개씩' },
  { value: '20', label: '20개씩' },
];

function TwoSelects() {
  const [kind, setKind] = useState('');
  const [size, setSize] = useState('20');
  return (
    <>
      <Select label="로그인 수단" allLabel="전체" value={kind} options={KINDS} onChange={setKind} />
      <Select ariaLabel="페이지당 개수" value={size} defaultValue="20" options={SIZES} onChange={setSize} />
      <p>바깥</p>
    </>
  );
}

describe('선택 메뉴 — 한 번에 하나만 열린다(결정 003 의 5)', () => {
  it('누르면 작은 목록이 열리고, 항목을 누르면 바로 적용되고 닫힌다 · 버튼은 "이름 · 값" + 보라 테두리', async () => {
    const user = userEvent.setup();
    ui(<TwoSelects />);
    const button = screen.getByRole('button', { name: '로그인 수단' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Apple' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    const chosen = screen.getByRole('button', { name: '로그인 수단 · Apple' });
    expect(chosen).toHaveClass('is-set');
  });

  it('열린 채 다른 선택 메뉴를 누르면 앞의 것은 닫히고 새것이 열린다', async () => {
    const user = userEvent.setup();
    ui(<TwoSelects />);
    await user.click(screen.getByRole('button', { name: '로그인 수단' }));
    expect(screen.getByRole('option', { name: '카카오' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '페이지당 개수' }));
    expect(screen.getAllByRole('listbox')).toHaveLength(1);
    expect(screen.queryByRole('option', { name: '카카오' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: '10개씩' })).toBeInTheDocument();
  });

  it('Esc · 바깥 누르기로 닫히고 고른 값은 그대로', async () => {
    const user = userEvent.setup();
    ui(<TwoSelects />);
    await user.click(screen.getByRole('button', { name: '페이지당 개수' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '페이지당 개수' }));
    await user.click(screen.getByText('바깥'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '페이지당 개수' })).toHaveTextContent('20개씩');
  });

  it('고른 항목에 체크가 있고, 기본값이면 테두리를 칠하지 않는다', async () => {
    const user = userEvent.setup();
    ui(<TwoSelects />);
    const size = screen.getByRole('button', { name: '페이지당 개수' });
    expect(size).not.toHaveClass('is-set');
    await user.click(size);
    expect(screen.getByRole('option', { name: '20개씩' })).toHaveAttribute('aria-selected', 'true');
  });

  it('폰에서는 아래 시트(제목 없음)로 열리고 어두운 곳을 누르면 닫힌다', async () => {
    phone();
    const user = userEvent.setup();
    ui(<TwoSelects />);
    await user.click(screen.getByRole('button', { name: '로그인 수단' }));
    const sheet = screen.getByRole('dialog', { name: '로그인 수단' });
    expect(within(sheet).queryByRole('heading')).not.toBeInTheDocument();
    expect(within(sheet).getByRole('option', { name: '카카오' })).toBeInTheDocument();
    await user.click(screen.getByTestId('sheet-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('폰 시트를 아래로 끌어내리면 닫힌다', async () => {
    phone();
    const user = userEvent.setup();
    ui(<TwoSelects />);
    await user.click(screen.getByRole('button', { name: '로그인 수단' }));
    const grab = screen.getByTestId('sheet-grab');
    fireEvent.pointerDown(grab, { clientY: 100 });
    fireEvent.pointerMove(grab, { clientY: 260 });
    fireEvent.pointerUp(grab, { clientY: 260 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

function Range({ onChange = vi.fn() }: { onChange?: (r: DateRange | null) => void }) {
  const [value, setValue] = useState<DateRange | null>(null);
  return (
    <>
      <DateRangeSelect
        label="가입일"
        value={value}
        today="2026-11-20"
        onChange={(r) => {
          setValue(r);
          onChange(r);
        }}
      />
      <Select label="로그인 수단" allLabel="전체" value="" options={KINDS} onChange={vi.fn()} />
      <p>바깥</p>
    </>
  );
}

describe('기간 고르기 — 시작 → 종료, 적용 전에는 바뀌지 않는다', () => {
  it('데스크톱은 두 달(이전 · 이번 달)이고, 종료일을 앞에 누르면 둘이 바뀌며, 적용해야 반영된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    ui(<Range onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '가입일' }));
    const panel = within(screen.getByRole('dialog', { name: '가입일' }));
    expect(panel.getByText(strings.picker.month(2026, 10))).toBeInTheDocument();
    expect(panel.getByText(strings.picker.month(2026, 11))).toBeInTheDocument();
    await user.click(panel.getByRole('button', { name: '2026.11.20' }));
    await user.click(panel.getByRole('button', { name: '2026.11.01' }));
    expect(panel.getByLabelText(strings.picker.start)).toHaveValue('2026.11.01');
    expect(panel.getByLabelText(strings.picker.end)).toHaveValue('2026.11.20');
    expect(onChange).not.toHaveBeenCalled();
    await user.click(panel.getByRole('button', { name: strings.picker.apply }));
    expect(onChange).toHaveBeenCalledWith({ from: '2026-11-01', to: '2026-11-20' });
    expect(screen.getByRole('button', { name: '가입일 · 2026.11.01 ~ 11.20' })).toHaveClass('is-set');
  });

  it('오늘 뒤 날짜는 고를 수 없다', async () => {
    const user = userEvent.setup();
    ui(<Range />);
    await user.click(screen.getByRole('button', { name: '가입일' }));
    expect(screen.getByRole('button', { name: '2026.11.21' })).toBeDisabled();
  });

  it('취소 · 바깥 누르기는 앞의 값으로 되돌린다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    ui(<Range onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '가입일' }));
    await user.click(screen.getByRole('button', { name: '2026.11.03' }));
    await user.click(screen.getByRole('button', { name: strings.picker.cancel }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '가입일' }));
    expect(screen.getByLabelText(strings.picker.start)).toHaveValue('');
    await user.click(screen.getByRole('button', { name: '2026.11.03' }));
    await user.click(screen.getByText('바깥'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('칸에 직접 적을 수 있고, 틀린 꼴 · 1년 넘는 기간은 알리고 적용을 막는다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    ui(<Range onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '가입일' }));
    const start = screen.getByLabelText(strings.picker.start);
    const end = screen.getByLabelText(strings.picker.end);
    await user.type(start, '2026.13.01');
    await user.tab();
    expect(screen.getByText(strings.picker.invalid)).toBeInTheDocument();
    await user.clear(start);
    await user.type(start, '2024.01.01');
    await user.type(end, '2026.11.20');
    await user.tab();
    expect(screen.getByText(strings.picker.tooLong)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: strings.picker.apply })).toBeDisabled();
    await user.clear(start);
    await user.type(start, '2026.11.01');
    await user.tab();
    await user.click(screen.getByRole('button', { name: strings.picker.apply }));
    expect(onChange).toHaveBeenCalledWith({ from: '2026-11-01', to: '2026-11-20' });
  });

  it('기간을 연 채 다른 선택 메뉴를 누르면 기간은 닫힌다', async () => {
    const user = userEvent.setup();
    ui(<Range />);
    await user.click(screen.getByRole('button', { name: '가입일' }));
    await user.click(screen.getByRole('button', { name: '로그인 수단' }));
    expect(screen.queryByRole('dialog', { name: '가입일' })).not.toBeInTheDocument();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('폰은 한 달 달력(아래 시트)', async () => {
    phone();
    const user = userEvent.setup();
    ui(<Range />);
    await user.click(screen.getByRole('button', { name: '가입일' }));
    const sheet = within(screen.getByRole('dialog', { name: '가입일' }));
    expect(sheet.getByText(strings.picker.month(2026, 11))).toBeInTheDocument();
    expect(sheet.queryByText(strings.picker.month(2026, 10))).not.toBeInTheDocument();
  });
});

describe('페이지 번호 — 10개 한 묶음, ‹ › 는 이전 · 다음 묶음', () => {
  it('첫 묶음은 1 ~ 10 이고 ‹ 는 흐리다 · › 는 11쪽으로', async () => {
    const onPage = vi.fn();
    const user = userEvent.setup();
    ui(<Pager total={412} page={0} size={20} onPage={onPage} onSize={vi.fn()} />);
    const nav = within(screen.getByRole('navigation', { name: strings.pager.label }));
    expect(nav.getAllByRole('button', { name: /^\d+쪽$/ }).map((b) => b.textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(nav.getByRole('button', { name: strings.pager.page(1) })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('button', { name: strings.pager.prevGroup })).toBeDisabled();
    await user.click(nav.getByRole('button', { name: strings.pager.nextGroup }));
    expect(onPage).toHaveBeenCalledWith(10);
    expect(screen.getByText(strings.pager.range(412, 1, 20))).toBeInTheDocument();
  });

  it('마지막 묶음은 남은 쪽만 보이고 › 는 흐리다', () => {
    ui(<Pager total={412} page={20} size={20} onPage={vi.fn()} onSize={vi.fn()} />);
    const nav = within(screen.getByRole('navigation', { name: strings.pager.label }));
    expect(nav.getAllByRole('button', { name: /^\d+쪽$/ }).map((b) => b.textContent)).toEqual(['21']);
    expect(nav.getByRole('button', { name: strings.pager.nextGroup })).toBeDisabled();
    expect(screen.getByText(strings.pager.range(412, 401, 412))).toBeInTheDocument();
  });

  it('"20개씩" 을 바꾸면 onSize', async () => {
    const onSize = vi.fn();
    const user = userEvent.setup();
    ui(<Pager total={50} page={0} size={20} onPage={vi.fn()} onSize={onSize} />);
    await user.click(screen.getByRole('button', { name: strings.pager.sizeLabel }));
    await user.click(screen.getByRole('option', { name: strings.pager.size(50) }));
    expect(onSize).toHaveBeenCalledWith(50);
  });
});

describe('⋯ 메뉴', () => {
  it('누르면 목록, 항목을 누르면 실행하고 닫힌다 · 다른 ⋯ 를 누르면 앞의 것은 닫힌다', async () => {
    const off = vi.fn();
    const user = userEvent.setup();
    ui(
      <>
        <MoreMenu label="lee 더 보기" items={[{ label: '비활성화', danger: true, onSelect: off }]} />
        <MoreMenu label="park 더 보기" items={[{ label: '활성화', onSelect: vi.fn() }]} />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'lee 더 보기' }));
    await user.click(screen.getByRole('button', { name: 'park 더 보기' }));
    expect(screen.queryByRole('menuitem', { name: '비활성화' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '활성화' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'lee 더 보기' }));
    await user.click(screen.getByRole('menuitem', { name: '비활성화' }));
    expect(off).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('확인 창', () => {
  it('Esc · 바깥 누르기는 취소', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    ui(<ConfirmDialog title="정지할까요?" confirmLabel="정지" danger onConfirm={vi.fn()} onCancel={onCancel} />);
    await user.keyboard('{Escape}');
    await user.click(screen.getByTestId('dialog-backdrop'));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('필요한 칸을 채우기 전엔 위험 버튼이 흐리다', () => {
    ui(
      <ConfirmDialog title="정지할까요?" confirmLabel="정지" danger confirmDisabled onConfirm={vi.fn()} onCancel={vi.fn()}>
        <input aria-label="사유" />
      </ConfirmDialog>,
    );
    expect(screen.getByRole('button', { name: '정지' })).toBeDisabled();
    expect(screen.getByLabelText('사유')).toBeInTheDocument();
  });
});

function ToastButtons() {
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => toast.success('저장했습니다')}>
        성공
      </button>
      <button type="button" onClick={() => toast.error('저장하지 못했습니다. 다시 시도해 주세요.')}>
        실패
      </button>
    </>
  );
}

describe('짧은 알림 — 아래 가운데, 성공 3초 · 실패 5초', () => {
  it('성공은 3초 뒤 사라진다', () => {
    vi.useFakeTimers();
    ui(<ToastButtons />);
    fireEvent.click(screen.getByRole('button', { name: '성공' }));
    expect(screen.getByRole('status')).toHaveTextContent('저장했습니다');
    act(() => vi.advanceTimersByTime(2999));
    expect(screen.queryByText('저장했습니다')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('저장했습니다')).not.toBeInTheDocument();
  });

  it('실패는 5초 뒤 사라지고 바로 읽어 준다(alert)', () => {
    vi.useFakeTimers();
    ui(<ToastButtons />);
    fireEvent.click(screen.getByRole('button', { name: '실패' }));
    expect(screen.getByRole('alert')).toHaveTextContent('저장하지 못했습니다');
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.queryByRole('alert')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('새 알림은 앞의 것을 바꾸고 시간을 새로 센다', () => {
    vi.useFakeTimers();
    ui(<ToastButtons />);
    fireEvent.click(screen.getByRole('button', { name: '실패' }));
    act(() => vi.advanceTimersByTime(4000));
    fireEvent.click(screen.getByRole('button', { name: '성공' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2999));
    expect(screen.getByRole('status')).toHaveTextContent('저장했습니다');
  });
});

describe('빈 상태', () => {
  it('처음부터 비면 안내만, 찾기 · 거르기로 비면 초기화 버튼', async () => {
    const onReset = vi.fn();
    const { rerender } = ui(<EmptyState title="답변 대기 문의가 없습니다" body="새 문의가 접수되면 표시됩니다." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <UiProvider>
          <EmptyState title="검색 결과가 없습니다" onReset={onReset} />
        </UiProvider>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: strings.empty.reset }));
    expect(onReset).toHaveBeenCalled();
  });
});

describe('찾기 칸 — 입력을 멈추고 0.3초 뒤, ✕ 로 지움', () => {
  it('멈춘 뒤에만 알리고, ✕ 는 바로 지운다', () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    ui(<SearchField label="검색" placeholder="내용 검색" value="" onCommit={onCommit} />);
    const box = screen.getByRole('searchbox', { name: '검색' });
    fireEvent.change(box, { target: { value: '알림' } });
    act(() => vi.advanceTimersByTime(299));
    expect(onCommit).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onCommit).toHaveBeenLastCalledWith('알림');
    fireEvent.click(screen.getByRole('button', { name: strings.search.clear }));
    expect(onCommit).toHaveBeenLastCalledWith('');
    expect(box).toHaveValue('');
  });
});

describe('표 — 모든 칸 가운데, 폰은 카드 목록', () => {
  const rows = [{ id: 'a', title: '알림이 오지 않아요' }];
  const columns = [{ key: 'title', header: '내용', render: (r: { title: string }) => r.title }];

  it('데스크톱은 표, 줄을 누르면 상세로 간다(링크)', () => {
    ui(<Table label="문의 목록" columns={columns} rows={rows} rowKey={(r) => r.id} rowLink={(r) => ({ to: `/inquiries/${r.id}` })} linkColumn="title" card={(r) => r.title} />);
    const table = screen.getByRole('table', { name: '문의 목록' });
    expect(within(table).getByRole('link', { name: '알림이 오지 않아요' })).toHaveAttribute('href', '/inquiries/a');
  });

  it('폰은 카드 목록이고 카드 전체가 링크다', () => {
    phone();
    ui(<Table label="문의 목록" columns={columns} rows={rows} rowKey={(r) => r.id} rowLink={(r) => ({ to: `/inquiries/${r.id}` })} linkColumn="title" card={(r) => r.title} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const list = screen.getByRole('list', { name: '문의 목록' });
    expect(within(list).getByRole('link', { name: '알림이 오지 않아요' })).toHaveAttribute('href', '/inquiries/a');
  });
});
