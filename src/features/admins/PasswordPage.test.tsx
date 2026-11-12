import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { strings } from '../../content/strings';
import { admin } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { PasswordPage } from './PasswordPage';

const t = strings.password;
const me = { status: 200, body: admin };
const PUT = 'PUT /admin/me/password';

const fill = async (current: string, next: string, confirm = next) => {
  const user = userEvent.setup();
  if (current) await user.type(screen.getByLabelText(t.current), current);
  if (next) await user.type(screen.getByLabelText(t.next), next);
  if (confirm) await user.type(screen.getByLabelText(t.confirm), confirm);
  await user.click(screen.getByRole('button', { name: t.submit }));
};
const allEmpty = () => {
  for (const label of [t.current, t.next, t.confirm]) expect(screen.getByLabelText(label)).toHaveValue('');
};

describe('비밀번호 변경', () => {
  it('바꾸면 알리고 칸을 모두 비운다. 다른 세션이 끝난다는 안내가 있다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me, [PUT]: { status: 204 } });
    renderApp(<PasswordPage />);
    expect(screen.getByText(t.note)).toBeInTheDocument();
    expect(screen.getByText(strings.passwordRule.help)).toBeInTheDocument();
    await fill('old-password-1', ' new password 1 ');
    expect(await screen.findByText(t.done)).toBeInTheDocument();
    expect(callsTo(calls, PUT)[0]?.body).toEqual({ currentPassword: 'old-password-1', newPassword: ' new password 1 ' });
    allEmpty();
  });

  it.each([
    ['INVALID_CURRENT_PASSWORD', 400, t.errors.INVALID_CURRENT_PASSWORD],
    ['INVALID_PASSWORD', 400, t.errors.INVALID_PASSWORD],
    ['RATE_LIMITED', 429, t.errors.RATE_LIMITED],
  ])('%s 를 알리고 칸을 비운다', async (code, status, text) => {
    mockFetch({ 'GET /admin/me': me, [PUT]: { status, body: { error: code } } });
    renderApp(<PasswordPage />);
    await fill('wrong-password', 'new-password-1');
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    allEmpty();
  });

  it('지금 비밀번호가 비었으면 보내지 않는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me });
    renderApp(<PasswordPage />);
    await fill('', 'new-password-1');
    expect(screen.getByText(t.required)).toBeInTheDocument();
    expect(callsTo(calls, PUT)).toHaveLength(0);
  });

  it('새 비밀번호가 10자보다 짧으면 보내지 않는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me });
    renderApp(<PasswordPage />);
    await fill('old-password-1', 'short');
    expect(screen.getByText(strings.passwordRule.TOO_SHORT)).toBeInTheDocument();
    expect(callsTo(calls, PUT)).toHaveLength(0);
  });

  it('72바이트를 넘으면 보내지 않는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me });
    renderApp(<PasswordPage />);
    await fill('old-password-1', '가'.repeat(25));
    expect(screen.getByText(strings.passwordRule.TOO_LONG)).toBeInTheDocument();
    expect(callsTo(calls, PUT)).toHaveLength(0);
  });

  it('두 번 쓴 새 비밀번호가 다르면 보내지 않는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': me });
    renderApp(<PasswordPage />);
    await fill('old-password-1', 'new-password-1', 'new-password-2');
    expect(screen.getByText(t.mismatch)).toBeInTheDocument();
    expect(callsTo(calls, PUT)).toHaveLength(0);
  });
});
