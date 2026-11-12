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
const item = (question: string) => within(screen.getByRole('article', { name: question }));
const questions = () =>
  within(screen.getByRole('list', { name: t.listLabel }))
    .getAllByRole('article')
    .map((el) => el.getAttribute('aria-label'));

describe('자주 묻는 질문', () => {
  it('순서대로, 공개하지 않은 것까지 보여 주고 앱에 늦게 보일 수 있다고 알린다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([a, b, c]) });
    renderApp(<FaqPage />);
    await screen.findByRole('article', { name: a.question });
    expect(questions()).toEqual([a.question, b.question, c.question]);
    expect(item(a.question).getByText(t.published)).toBeInTheDocument();
    expect(item(b.question).getByText(t.unpublished)).toBeInTheDocument();
    const answer = item(a.question).getByText(/첫째 답/);
    expect(answer.textContent).toBe('첫째 답\n둘째 줄');
    expect(answer).toHaveClass('prewrap');
    expect(screen.getByText(t.cacheNote)).toBeInTheDocument();
    expect(t.cacheNote).toContain('5분');
    expect(item(a.question).getByText(t.updated(admin.name, '2026-11-12 13:05'))).toBeInTheDocument();
  });

  it('글이 없으면 알린다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([]) });
    renderApp(<FaqPage />);
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('받지 못하면 알리고 다시 시도할 수 있다', async () => {
    const { routes } = mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': { status: 500, body: { error: 'X' } } });
    renderApp(<FaqPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.UNKNOWN);
    routes['GET /admin/faqs'] = list([a]);
    await userEvent.click(screen.getByRole('button', { name: strings.common.retry }));
    expect(await screen.findByRole('article', { name: a.question })).toBeInTheDocument();
  });

  it('만들기: 앞뒤 공백을 떼고 비공개로 보내고 목록 끝에 붙인다', async () => {
    const created = faq({ id: uid(4), question: '새 질문?', answer: '새 답', published: false, sortOrder: 10 });
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([a]), 'POST /admin/faqs': { status: 201, body: created } });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('article', { name: a.question });
    await user.click(screen.getByRole('button', { name: t.create }));
    const form = within(screen.getByRole('form', { name: t.createTitle }));
    await user.type(form.getByLabelText(t.question), '  새 질문?  ');
    await user.type(form.getByLabelText(t.answer), '새 답');
    await user.click(form.getByRole('button', { name: t.createSubmit }));
    expect(await screen.findByText(t.done.created)).toBeInTheDocument();
    expect(callsTo(calls, 'POST /admin/faqs')[0]?.body).toEqual({ question: '새 질문?', answer: '새 답', published: false });
    expect(questions()).toEqual([a.question, '새 질문?']);
    expect(item('새 질문?').getByText(t.unpublished)).toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('글자 수를 코드 포인트로 세고(질문 200 · 답 2000) 비었거나 넘으면 보내지 못한다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([]) });
    renderApp(<FaqPage />);
    await userEvent.click(await screen.findByRole('button', { name: t.create }));
    const form = within(screen.getByRole('form', { name: t.createTitle }));
    const submit = form.getByRole('button', { name: t.createSubmit });
    expect(submit).toBeDisabled();
    fireEvent.change(form.getByLabelText(t.question), { target: { value: '😀'.repeat(200) } });
    fireEvent.change(form.getByLabelText(t.answer), { target: { value: '가'.repeat(2000) } });
    expect(form.getByText(strings.common.counter(200, 200))).toBeInTheDocument();
    expect(form.getByText(strings.common.counter(2000, 2000))).toBeInTheDocument();
    expect(submit).toBeEnabled();
    fireEvent.change(form.getByLabelText(t.question), { target: { value: '😀'.repeat(201) } });
    expect(submit).toBeDisabled();
    fireEvent.change(form.getByLabelText(t.question), { target: { value: '질문' } });
    fireEvent.change(form.getByLabelText(t.answer), { target: { value: '가'.repeat(2001) } });
    expect(submit).toBeDisabled();
    fireEvent.change(form.getByLabelText(t.answer), { target: { value: '   ' } });
    expect(submit).toBeDisabled();
    expect(callsTo(calls, 'POST /admin/faqs')).toHaveLength(0);
  });

  it('서버가 INVALID_QUESTION 으로 거절하면 알리고 쓴 글을 그대로 둔다', async () => {
    mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([]), 'POST /admin/faqs': { status: 400, body: { error: 'INVALID_QUESTION' } } });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await user.click(await screen.findByRole('button', { name: t.create }));
    const form = within(screen.getByRole('form', { name: t.createTitle }));
    await user.type(form.getByLabelText(t.question), '질문');
    await user.type(form.getByLabelText(t.answer), '답');
    await user.click(form.getByRole('button', { name: t.createSubmit }));
    expect(await form.findByRole('alert')).toHaveTextContent(t.errors.INVALID_QUESTION);
    expect(form.getByLabelText(t.question)).toHaveValue('질문');
  });

  it('고치기: 바뀐 키만 보낸다', async () => {
    const { calls } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/faqs': list([a, b]),
      [`PATCH /admin/faqs/${a.id}`]: { status: 200, body: { ...a, answer: '고친 답' } },
    });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('article', { name: a.question });
    await user.click(item(a.question).getByRole('button', { name: t.edit }));
    const form = within(screen.getByRole('form', { name: t.editTitle }));
    expect(form.getByLabelText(t.question)).toHaveValue(a.question);
    await user.clear(form.getByLabelText(t.answer));
    await user.type(form.getByLabelText(t.answer), '고친 답');
    await user.click(form.getByRole('button', { name: t.editSubmit }));
    expect(await screen.findByText(t.done.saved)).toBeInTheDocument();
    expect(callsTo(calls, `PATCH /admin/faqs/${a.id}`)[0]?.body).toEqual({ answer: '고친 답' });
    expect(item(a.question).getByText('고친 답')).toBeInTheDocument();
  });

  it('공개하고 내린다', async () => {
    const { calls, routes } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/faqs': list([b]),
      [`PATCH /admin/faqs/${b.id}`]: { status: 200, body: { ...b, published: true } },
    });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('article', { name: b.question });
    await user.click(item(b.question).getByRole('button', { name: t.publish }));
    expect(await screen.findByText(t.done.published)).toBeInTheDocument();
    expect(item(b.question).getByText(t.published)).toBeInTheDocument();
    routes[`PATCH /admin/faqs/${b.id}`] = { status: 200, body: { ...b, published: false } };
    await user.click(item(b.question).getByRole('button', { name: t.unpublish }));
    expect(await screen.findByText(t.done.unpublished)).toBeInTheDocument();
    expect(callsTo(calls, `PATCH /admin/faqs/${b.id}`).map((x) => x.body)).toEqual([{ published: true }, { published: false }]);
  });

  it('지우기는 먼저 묻는다: 취소하면 부르지 않고, 확인하면 지운다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list([a, b]), [`DELETE /admin/faqs/${a.id}`]: { status: 204 } });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('article', { name: a.question });
    await user.click(item(a.question).getByRole('button', { name: t.remove }));
    const dialog = within(screen.getByRole('alertdialog', { name: t.removeTitle }));
    expect(dialog.getByText(t.removeBody(a.question))).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: strings.common.cancel }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(callsTo(calls, `DELETE /admin/faqs/${a.id}`)).toHaveLength(0);

    await user.click(item(a.question).getByRole('button', { name: t.remove }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: t.remove }));
    expect(await screen.findByText(t.done.removed)).toBeInTheDocument();
    expect(callsTo(calls, `DELETE /admin/faqs/${a.id}`)).toHaveLength(1);
    expect(questions()).toEqual([b.question]);
  });

  it('이미 지워진 질문(NOT_FOUND)이면 목록을 다시 받아 온다', async () => {
    const { calls, routes } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/faqs': list([a, b]),
      [`PATCH /admin/faqs/${b.id}`]: { status: 404, body: { error: 'NOT_FOUND' } },
    });
    renderApp(<FaqPage />);
    await screen.findByRole('article', { name: b.question });
    routes['GET /admin/faqs'] = list([a]);
    await userEvent.click(item(b.question).getByRole('button', { name: t.publish }));
    expect(await screen.findByText(t.goneReloaded)).toBeInTheDocument();
    expect(callsTo(calls, 'GET /admin/faqs')).toHaveLength(2);
    expect(questions()).toEqual([a.question]);
  });

  it('위·아래로 옮기면 전체 id 를 새 순서로 보내고 받은 목록으로 그린다', async () => {
    const { calls } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/faqs': list([a, b, c]),
      'PUT /admin/faqs/order': (req) => {
        const ids = (req.body as { ids: string[] }).ids;
        return { status: 200, body: ids.map((id) => [a, b, c].find((f) => f.id === id)) };
      },
    });
    const user = userEvent.setup();
    renderApp(<FaqPage />);
    await screen.findByRole('article', { name: a.question });
    expect(item(a.question).getByRole('button', { name: t.moveUp })).toBeDisabled();
    expect(item(c.question).getByRole('button', { name: t.moveDown })).toBeDisabled();
    await user.click(item(a.question).getByRole('button', { name: t.moveDown }));
    expect(await screen.findByText(t.done.moved)).toBeInTheDocument();
    expect(callsTo(calls, 'PUT /admin/faqs/order')[0]?.body).toEqual({ ids: [b.id, a.id, c.id] });
    expect(questions()).toEqual([b.question, a.question, c.question]);
    await user.click(item(c.question).getByRole('button', { name: t.moveUp }));
    expect(callsTo(calls, 'PUT /admin/faqs/order')[1]?.body).toEqual({ ids: [b.id, c.id, a.id] });
  });

  it('INVALID_ORDER 면 목록을 다시 받아 오고 까닭을 알린다', async () => {
    const { calls, routes } = mockFetch({
      'GET /admin/me': me,
      'GET /admin/faqs': list([a, b]),
      'PUT /admin/faqs/order': { status: 400, body: { error: 'INVALID_ORDER' } },
    });
    renderApp(<FaqPage />);
    await screen.findByRole('article', { name: a.question });
    routes['GET /admin/faqs'] = list([a, b, c]);
    await userEvent.click(item(a.question).getByRole('button', { name: t.moveDown }));
    expect(await screen.findByText(t.orderChanged)).toBeInTheDocument();
    expect(callsTo(calls, 'GET /admin/faqs')).toHaveLength(2);
    expect(questions()).toEqual([a.question, b.question, c.question]);
  });
});

describe('초안 불러오기', () => {
  it('초안 파일에는 한도 안의 질문·답이 열 개 있고 질문이 겹치지 않는다', () => {
    expect(seed).toHaveLength(10);
    for (const entry of seed) {
      expect(codePointLength(entry.question.trim())).toBeGreaterThan(0);
      expect(codePointLength(entry.question)).toBeLessThanOrEqual(200);
      expect(codePointLength(entry.answer.trim())).toBeGreaterThan(0);
      expect(codePointLength(entry.answer)).toBeLessThanOrEqual(2000);
    }
    expect(new Set(seed.map((entry) => entry.question)).size).toBe(10);
  });

  it('같은 질문이 없는 초안만 비공개로 만들고 목록을 다시 받는다', async () => {
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
    await screen.findByRole('article', { name: first.question });
    expect(screen.getByText(t.seed.help)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t.seed.button }));
    expect(await screen.findByText(t.seed.done(9, 1))).toBeInTheDocument();
    const posts = callsTo(calls, 'POST /admin/faqs').map((x) => x.body);
    expect(posts).toEqual(seed.slice(1).map((entry) => ({ question: entry.question, answer: entry.answer, published: false })));
    expect(questions()).toHaveLength(10);
    expect(item(first.question).getByText('이미 고쳐 쓴 답')).toBeInTheDocument();
  });

  it('모두 들어 있으면 만들지 않는다', async () => {
    const all = seed.map((entry, i) => faq({ ...entry, id: `eeeeeeee-eeee-4eee-8eee-${String(i).padStart(12, '0')}`, sortOrder: i }));
    const { calls } = mockFetch({ 'GET /admin/me': me, 'GET /admin/faqs': list(all) });
    renderApp(<FaqPage />);
    await userEvent.click(await screen.findByRole('button', { name: t.seed.button }));
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
    await userEvent.click(await screen.findByRole('button', { name: t.seed.button }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(t.seed.stopped(2));
    expect(alert).toHaveTextContent(strings.errors.RATE_LIMITED);
    expect(posts).toBe(3);
    expect(questions()).toHaveLength(2);
  });
});
