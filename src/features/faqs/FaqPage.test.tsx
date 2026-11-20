import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import seed from '../../content/faq-seed.json';
import { strings } from '../../content/strings';
import type { Faq } from '../../lib/api/types';
import { codePointLength } from '../../lib/text';
import { admin, faq } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { FaqPage } from './FaqPage';

const t = strings.faqs;
const me = { status: 200, body: admin };
const uid = (n: number) => `ffffffff-ffff-4fff-8fff-fffffffffff${n}`;
const a = faq({ id: uid(1), question: '첫째 질문', answer: '첫째 답\n둘째 줄', sortOrder: 1, published: true });
const b = faq({ id: uid(2), question: '둘째 질문', answer: '둘째 답', sortOrder: 5, published: false });
const c = faq({ id: uid(3), question: '셋째 질문', answer: '셋째 답', sortOrder: 9, published: true });
const list = (items: Faq[]) => ({ status: 200, body: items });
const listBox = () => within(screen.getByRole('list', { name: t.listLabel }));
const questions = () => listBox().getAllByRole('listitem').map((li) => li.querySelector('.faq-row__q')?.textContent);
const pick = async (question: string) => userEvent.click(listBox().getByRole('button', { name: question }));
const editor = (name: string = t.editTitle) => within(screen.getByRole('form', { name }));

describe('자주 묻는 질문(D8)', () => {
  it('왼쪽은 순서대로(공개하지 않은 것까지) 번호 · 질문 · 공개 여부, 머리에 개수와 앱 반영 안내', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([a, b, c]) });
    renderApp(<FaqPage />);
    await screen.findByRole('list', { name: t.listLabel });
    expect(questions()).toEqual(['첫째 질문', '둘째 질문', '셋째 질문']);
    expect(screen.getByText(t.listTitle(3))).toBeInTheDocument();
    expect(screen.getByText(t.listNote)).toBeInTheDocument();
    expect(listBox().getAllByText(t.unpublished)).toHaveLength(1);
    expect(screen.getByText(t.pickHint)).toBeInTheDocument();
  });

  it('질문을 누르면 오른쪽 편집에 질문 · 답 · 최종 수정이 채워진다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([a, b]) });
    renderApp(<FaqPage />);
    await screen.findByRole('list', { name: t.listLabel });
    await pick('첫째 질문');
    expect(listBox().getByRole('button', { name: '첫째 질문' })).toHaveAttribute('aria-pressed', 'true');
    expect(editor().getByLabelText(t.question)).toHaveValue('첫째 질문');
    expect(editor().getByLabelText(t.answer)).toHaveValue('첫째 답\n둘째 줄');
    expect(editor().getByText(t.updated(admin.name, '2026.11.12 13:05:06'))).toBeInTheDocument();
  });

  it('글이 없으면 안내한다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([]) });
    renderApp(<FaqPage />);
    expect(await screen.findByText(t.empty.title)).toBeInTheDocument();
  });

  it('받지 못하면 알리고 다시 시도할 수 있다', async () => {
    const { routes } = mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': { status: 500, body: { error: 'X' } } });
    renderApp(<FaqPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.UNKNOWN);
    routes['GET /admin/faqs'] = list([a]);
    await userEvent.click(screen.getByRole('button', { name: strings.common.retry }));
    expect(await screen.findByRole('list', { name: t.listLabel })).toBeInTheDocument();
  });

  it('질문 추가: 앞뒤 공백을 떼고 비공개로 보내고 목록 끝에 붙인 뒤 그 질문을 편집으로 연다', async () => {
    const made = faq({ id: uid(4), question: '새 질문', answer: '새 답', sortOrder: 10, published: false });
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([a]), 'POST /admin/faqs': { status: 201, body: made } });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('list', { name: t.listLabel });
    await user.click(screen.getByRole('button', { name: t.create }));
    const form = editor(t.createTitle);
    expect(form.getByText(t.createHelp)).toBeInTheDocument();
    await user.type(form.getByLabelText(t.question), '  새 질문 ');
    await user.type(form.getByLabelText(t.answer), ' 새 답  ');
    await user.click(form.getByRole('button', { name: t.add }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.done.created);
    expect(callsTo(calls, 'POST /admin/faqs')[0]?.body).toEqual({ question: '새 질문', answer: '새 답', published: false });
    expect(questions()).toEqual(['첫째 질문', '새 질문']);
    expect(editor().getByLabelText(t.question)).toHaveValue('새 질문');
  });

  it('글자 수를 코드 포인트로 세고(질문 200 · 답 2000) 비었거나 넘으면 보내지 못한다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([a]) });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('list', { name: t.listLabel });
    await user.click(screen.getByRole('button', { name: t.create }));
    const form = editor(t.createTitle);
    const add = form.getByRole('button', { name: t.add });
    expect(add).toBeDisabled();
    fireEvent.change(form.getByLabelText(t.question), { target: { value: '😀'.repeat(200) } });
    fireEvent.change(form.getByLabelText(t.answer), { target: { value: '답' } });
    expect(add).toBeEnabled();
    fireEvent.change(form.getByLabelText(t.question), { target: { value: '😀'.repeat(201) } });
    expect(add).toBeDisabled();
    fireEvent.change(form.getByLabelText(t.question), { target: { value: '질문' } });
    fireEvent.change(form.getByLabelText(t.answer), { target: { value: '가'.repeat(2001) } });
    expect(add).toBeDisabled();
    expect(form.getByText(strings.common.counter(2001, 2000))).toBeInTheDocument();
  });

  it('서버가 INVALID_QUESTION 으로 거절하면 짧은 알림으로 알리고 쓴 글을 그대로 둔다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([a]), 'POST /admin/faqs': { status: 400, body: { error: 'INVALID_QUESTION' } } });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('list', { name: t.listLabel });
    await user.click(screen.getByRole('button', { name: t.create }));
    const form = editor(t.createTitle);
    await user.type(form.getByLabelText(t.question), '질문');
    await user.type(form.getByLabelText(t.answer), '답');
    await user.click(form.getByRole('button', { name: t.add }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t.errors.INVALID_QUESTION);
    expect(form.getByLabelText(t.question)).toHaveValue('질문');
  });

  it('저장: 바뀐 키만 보낸다', async () => {
    const { calls } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/faqs': list([a, b]),
      [`PATCH /admin/faqs/${a.id}`]: (req) => ({ status: 200, body: { ...a, ...(req.body as object) } }),
    });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('list', { name: t.listLabel });
    await pick('첫째 질문');
    const answer = editor().getByLabelText(t.answer);
    await user.clear(answer);
    await user.type(answer, '고친 답');
    await user.click(editor().getByRole('button', { name: t.save }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.done.saved);
    expect(callsTo(calls, `PATCH /admin/faqs/${a.id}`)[0]?.body).toEqual({ answer: '고친 답' });
  });

  it('공개 · 비공개 전환', async () => {
    const { calls } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/faqs': list([a, b]),
      [`PATCH /admin/faqs/${b.id}`]: { status: 200, body: { ...b, published: true } },
    });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('list', { name: t.listLabel });
    await pick('둘째 질문');
    await user.click(editor().getByRole('button', { name: t.publish }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.done.published);
    expect(callsTo(calls, `PATCH /admin/faqs/${b.id}`)[0]?.body).toEqual({ published: true });
    expect(editor().getByRole('button', { name: t.unpublish })).toBeInTheDocument();
  });

  it('삭제는 먼저 묻는다: 취소하면 부르지 않고, 확인하면 지운다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([a, b]), [`DELETE /admin/faqs/${a.id}`]: { status: 204 } });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('list', { name: t.listLabel });
    await pick('첫째 질문');
    await user.click(editor().getByRole('button', { name: t.remove }));
    await user.click(within(screen.getByRole('alertdialog', { name: t.removeTitle })).getByRole('button', { name: strings.common.cancel }));
    expect(callsTo(calls, `DELETE /admin/faqs/${a.id}`)).toHaveLength(0);
    await user.click(editor().getByRole('button', { name: t.remove }));
    await user.click(within(screen.getByRole('alertdialog', { name: t.removeTitle })).getByRole('button', { name: t.remove }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.done.removed);
    expect(questions()).toEqual(['둘째 질문']);
    expect(screen.getByText(t.pickHint)).toBeInTheDocument();
  });

  it('이미 지워진 질문(NOT_FOUND)이면 목록을 다시 받아 온다', async () => {
    const { calls } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/faqs': list([a, b]),
      [`PATCH /admin/faqs/${a.id}`]: { status: 404, body: { error: 'NOT_FOUND' } },
    });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('list', { name: t.listLabel });
    await pick('첫째 질문');
    await user.click(editor().getByRole('button', { name: t.unpublish }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.goneReloaded);
    expect(callsTo(calls, 'GET /admin/faqs')).toHaveLength(2);
  });

  it('⌃ ⌄ 로 옮기면 전체 id 를 새 순서로 보내고 받은 목록으로 그린다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([a, b, c]), 'PUT /admin/faqs/order': list([b, a, c]) });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('list', { name: t.listLabel });
    expect(listBox().getByRole('button', { name: t.moveUp('첫째 질문') })).toBeDisabled();
    expect(listBox().getByRole('button', { name: t.moveDown('셋째 질문') })).toBeDisabled();
    await user.click(listBox().getByRole('button', { name: t.moveDown('첫째 질문') }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.done.moved);
    expect(callsTo(calls, 'PUT /admin/faqs/order')[0]?.body).toEqual({ ids: [b.id, a.id, c.id] });
    expect(questions()).toEqual(['둘째 질문', '첫째 질문', '셋째 질문']);
  });

  it('INVALID_ORDER 면 목록을 다시 받아 오고 까닭을 알린다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([a, b]), 'PUT /admin/faqs/order': { status: 400, body: { error: 'INVALID_ORDER' } } });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('list', { name: t.listLabel });
    await user.click(listBox().getByRole('button', { name: t.moveUp('둘째 질문') }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.orderChanged);
    expect(callsTo(calls, 'GET /admin/faqs')).toHaveLength(2);
  });

  it('초안 파일에는 한도 안의 질문 · 답이 열 개 있고 질문이 겹치지 않는다', () => {
    expect(seed).toHaveLength(10);
    for (const entry of seed) {
      expect(codePointLength(entry.question.trim())).toBeGreaterThan(0);
      expect(codePointLength(entry.question)).toBeLessThanOrEqual(200);
      expect(codePointLength(entry.answer.trim())).toBeGreaterThan(0);
      expect(codePointLength(entry.answer)).toBeLessThanOrEqual(2000);
    }
    expect(new Set(seed.map((entry) => entry.question)).size).toBe(10);
  });

  it('기본 질문 불러오기: 같은 질문이 없는 것만 비공개로 만들고 목록을 다시 받는다', async () => {
    const first = seed[0] as { question: string; answer: string };
    const existing = faq({ id: uid(1), question: first.question, answer: '이미 고쳐 쓴 답' });
    const store: Faq[] = [existing];
    const { calls } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/faqs': () => list([...store]),
      'POST /admin/faqs': (req) => {
        const body = req.body as { question: string; answer: string; published: boolean };
        const made = faq({ ...body, id: `eeeeeeee-eeee-4eee-8eee-${String(store.length).padStart(12, '0')}`, sortOrder: store.length + 1 });
        store.push(made);
        return { status: 201, body: made };
      },
    });
    renderApp(<FaqPage />);
    await screen.findByRole('list', { name: t.listLabel });
    await userEvent.click(screen.getByRole('button', { name: t.seed.button }));
    expect(await screen.findByText(t.seed.done(9, 1))).toBeInTheDocument();
    const posts = callsTo(calls, 'POST /admin/faqs').map((x) => x.body);
    expect(posts).toEqual(seed.slice(1).map((entry) => ({ question: entry.question, answer: entry.answer, published: false })));
    expect(await screen.findByText(t.listTitle(10))).toBeInTheDocument();
  });

  it('모두 들어 있으면 만들지 않는다', async () => {
    const all = seed.map((entry, i) => faq({ ...entry, id: `eeeeeeee-eeee-4eee-8eee-${String(i).padStart(12, '0')}`, sortOrder: i }));
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list(all) });
    renderApp(<FaqPage />);
    await screen.findByRole('list', { name: t.listLabel });
    await userEvent.click(screen.getByRole('button', { name: t.seed.button }));
    expect(await screen.findByText(t.seed.nothing)).toBeInTheDocument();
    expect(callsTo(calls, 'POST /admin/faqs')).toHaveLength(0);
  });

  it('중간에 실패하면 멈추고, 넣은 수와 까닭을 알린다', async () => {
    let posts = 0;
    const store: Faq[] = [];
    mockFetch({
      'GET /admin/me': me,
      'GET /admin/faqs': () => list([...store]),
      'POST /admin/faqs': (req) => {
        posts += 1;
        if (posts > 2) return { status: 429, body: { error: 'RATE_LIMITED' } };
        const made = faq({ ...(req.body as object), id: `eeeeeeee-eeee-4eee-8eee-${String(posts).padStart(12, '0')}` });
        store.push(made);
        return { status: 201, body: made };
      },
    });
    renderApp(<FaqPage />);
    await screen.findByText(t.empty.title);
    await userEvent.click(screen.getByRole('button', { name: t.seed.button }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(t.seed.stopped(2));
    expect(alert).toHaveTextContent(strings.errors.RATE_LIMITED);
    expect(posts).toBe(3);
    expect(await screen.findByText(t.listTitle(2))).toBeInTheDocument();
  });
});
