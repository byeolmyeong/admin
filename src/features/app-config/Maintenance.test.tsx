import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { strings } from '../../content/strings';
import type { Maintenance } from '../../lib/api/types';
import { admin, appConfig, maintenance } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import type { Route } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { AppConfigPage } from './AppConfigPage';

const t = strings.appConfig.maintenance;
const me = { status: 200, body: admin };
const PUT = 'PUT /admin/app-config/maintenance';
const by = { id: admin.id, name: admin.name };
const echo: Route = (req) => ({ status: 200, body: { ...(req.body as object), updatedAt: '2026-11-12T17:00:00Z', updatedBy: by } });

const open = async (state: Maintenance = maintenance(), put: Route = echo) => {
  const mock = mockFetch({ 'GET /admin/me': me, 'GET /admin/app-config': { status: 200, body: appConfig({ maintenance: state }) }, [PUT]: put });
  renderApp(<AppConfigPage />);
  await screen.findByRole('form', { name: t.title });
  return mock;
};
const card = () => within(screen.getByRole('form', { name: t.title }));
const toggle = () => card().getByRole('switch', { name: t.active });
const save = () => userEvent.click(card().getByRole('button', { name: strings.common.save }));

describe('앱 설정 — 점검(D6)', () => {
  it('지금 상태 표 · 점검 모드 스위치(설명) · 안내 문구', async () => {
    await open(maintenance({ active: true, message: '새벽 2시부터 4시까지 점검해요.', updatedBy: by }));
    expect(card().getByText(t.on)).toBeInTheDocument();
    expect(toggle()).toBeChecked();
    expect(toggle()).toHaveAccessibleDescription(t.activeHelp);
    expect(card().getByLabelText(t.message)).toHaveValue('새벽 2시부터 4시까지 점검해요.');
    expect(card().getByLabelText(t.message)).toHaveAttribute('placeholder', t.messagePlaceholder);
  });

  it('켜기는 반드시 묻는다: 취소하면 보내지 않고, 확인하면 두 키를 보낸다', async () => {
    const { calls } = await open();
    expect(card().getByText(t.off)).toBeInTheDocument();
    await userEvent.type(card().getByLabelText(t.message), ' 잠시 점검해요. ');
    await userEvent.click(toggle());
    await save();
    const dialog = within(screen.getByRole('alertdialog', { name: t.confirmTitle }));
    expect(dialog.getByText(t.confirmBody)).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: strings.common.cancel }));
    expect(callsTo(calls, PUT)).toHaveLength(0);
    expect(card().getByText(t.off)).toBeInTheDocument();

    await save();
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: t.confirmLabel }));
    expect(await screen.findByRole('status')).toHaveTextContent(t.savedOn);
    expect(callsTo(calls, PUT)[0]?.body).toEqual({ active: true, message: '잠시 점검해요.' });
    expect(card().getByText(t.on)).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('끄기는 묻지 않고, 안내 문구는 남겨 둔 채 두 키를 보낸다', async () => {
    const { calls } = await open(maintenance({ active: true, message: '점검해요.' }));
    await userEvent.click(toggle());
    await save();
    expect(await screen.findByRole('status')).toHaveTextContent(t.savedOff);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(callsTo(calls, PUT)[0]?.body).toEqual({ active: false, message: '점검해요.' });
    expect(card().getByText(t.off)).toBeInTheDocument();
  });

  it('켜진 채로 문구만 고치면 묻지 않는다. 비운 문구는 null 이다', async () => {
    const { calls } = await open(maintenance({ active: true, message: '점검해요.' }));
    await userEvent.clear(card().getByLabelText(t.message));
    await save();
    expect(await screen.findByRole('status')).toHaveTextContent(t.saved);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(callsTo(calls, PUT)[0]?.body).toEqual({ active: true, message: null });
  });

  it('안내 문구는 코드 포인트로 200자까지다', async () => {
    const { calls } = await open();
    await userEvent.click(card().getByLabelText(t.message));
    await userEvent.paste('🙂'.repeat(200));
    expect(card().getByText(strings.common.counter(200, 200))).toBeInTheDocument();
    await userEvent.paste('가');
    await save();
    expect(card().getByText(t.errors.INVALID_MESSAGE)).toBeInTheDocument();
    expect(callsTo(calls, PUT)).toHaveLength(0);
  });

  it('서버가 INVALID_MESSAGE 로 거절하면 짧은 알림으로 알리고 상태 · 글은 그대로 둔다', async () => {
    await open(maintenance(), { status: 400, body: { error: 'INVALID_MESSAGE' } });
    await userEvent.type(card().getByLabelText(t.message), '글');
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent(t.errors.INVALID_MESSAGE);
    expect(card().getByText(t.off)).toBeInTheDocument();
    expect(card().getByLabelText(t.message)).toHaveValue('글');
  });
});
