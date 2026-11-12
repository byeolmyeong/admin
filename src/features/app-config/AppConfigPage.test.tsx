import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { strings } from '../../content/strings';
import type { PlatformConfig } from '../../lib/api/types';
import { admin, appConfig, platformConfig } from '../../test/fixtures';
import { callsTo, mockFetch } from '../../test/mockFetch';
import type { Route } from '../../test/mockFetch';
import { renderApp } from '../../test/render';
import { AppConfigPage } from './AppConfigPage';

const t = strings.appConfig;
const me = { status: 200, body: admin };
const GET = 'GET /admin/app-config';
const PUT_IOS = 'PUT /admin/app-config/ios';
const PUT_ANDROID = 'PUT /admin/app-config/android';
const by = { id: admin.id, name: admin.name };
const iosSet = platformConfig({
  minVersion: '1.2.0',
  storeUrl: 'https://apps.apple.com/kr/app/id0000000000',
  message: '새 버전이 나왔어요.',
  blockNow: false,
  updatedAt: '2026-11-12T06:00:00Z',
  updatedBy: by,
});
/** 보낸 본문을 그대로 저장한 것처럼 답한다 */
const echo: Route = (req) => ({ status: 200, body: { ...(req.body as object), updatedAt: '2026-11-12T07:00:00Z', updatedBy: by } });

const open = async (ios: PlatformConfig = iosSet, over: Record<string, Route> = {}) => {
  const mock = mockFetch({ 'GET /admin/me': me, [GET]: { status: 200, body: appConfig({ ios }) }, [PUT_IOS]: echo, [PUT_ANDROID]: echo, ...over });
  renderApp(<AppConfigPage />);
  await screen.findByRole('form', { name: t.platformTitle(t.platforms.ios) });
  return mock;
};
const ios = () => within(screen.getByRole('form', { name: t.platformTitle(t.platforms.ios) }));
const android = () => within(screen.getByRole('form', { name: t.platformTitle(t.platforms.android) }));
const save = (card = ios()) => userEvent.click(card.getByRole('button', { name: strings.common.save }));
const retype = async (field: HTMLElement, text: string) => {
  await userEvent.clear(field);
  if (text) await userEvent.type(field, text);
};

describe('앱 설정 — 플랫폼', () => {
  it('iOS · Android 두 폼에 받은 값을 채우고, 마지막 수정과 안내를 보여 준다', async () => {
    await open();
    expect(ios().getByLabelText(t.minVersion)).toHaveValue('1.2.0');
    expect(ios().getByLabelText(t.storeUrl)).toHaveValue('https://apps.apple.com/kr/app/id0000000000');
    expect(ios().getByLabelText(t.message)).toHaveValue('새 버전이 나왔어요.');
    expect(ios().getByRole('switch', { name: t.blockNow })).not.toBeChecked();
    expect(ios().getByText(t.updated(admin.name, '2026-11-12 15:00'))).toBeInTheDocument();
    expect(ios().getByText(t.blockNote)).toBeInTheDocument();

    expect(android().getByLabelText(t.minVersion)).toHaveValue('');
    expect(android().getByLabelText(t.storeUrl)).toHaveValue('');
    expect(android().getByLabelText(t.message)).toHaveValue('');
    expect(android().getByText(t.updated(null, '2026-11-12 13:05'))).toBeInTheDocument();

    expect(screen.getByText(t.delayNote)).toBeInTheDocument();
    expect(t.delayNote).toMatch(/1분/);
    expect(t.blockNote).toMatch(/하던 일은 끊지 않아요/);
    expect(t.blockNote).toMatch(/바로 거절/);
  });

  it('받지 못하면 알리고 다시 시도할 수 있다', async () => {
    const { routes } = mockFetch({ 'GET /admin/me': me, [GET]: { status: 500, body: { error: 'X' } } });
    renderApp(<AppConfigPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.UNKNOWN);
    routes[GET] = { status: 200, body: appConfig() };
    await userEvent.click(screen.getByRole('button', { name: strings.common.retry }));
    expect(await screen.findByRole('form', { name: t.platformTitle(t.platforms.ios) })).toBeInTheDocument();
  });

  it('저장은 바꾸지 않은 값까지 네 키를 모두 보낸다(안내 문구는 공백을 떼고)', async () => {
    const { calls } = await open();
    await retype(ios().getByLabelText(t.message), '  더 안정적인 새 버전이에요.  ');
    await save();
    expect(await ios().findByText(t.saved(t.platforms.ios))).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(callsTo(calls, PUT_IOS)).toHaveLength(1);
    expect(callsTo(calls, PUT_IOS)[0]?.body).toEqual({
      minVersion: '1.2.0',
      storeUrl: 'https://apps.apple.com/kr/app/id0000000000',
      message: '더 안정적인 새 버전이에요.',
      blockNow: false,
    });
    expect(ios().getByLabelText(t.message)).toHaveValue('더 안정적인 새 버전이에요.');
    expect(ios().getByText(t.updated(admin.name, '2026-11-12 16:00'))).toBeInTheDocument();
    expect(callsTo(calls, PUT_ANDROID)).toHaveLength(0);
  });

  it('비운 칸은 빈 글이 아니라 null 로 보낸다(그래도 네 키 모두)', async () => {
    const { calls } = await open();
    await retype(ios().getByLabelText(t.minVersion), '');
    await retype(ios().getByLabelText(t.storeUrl), '');
    await retype(ios().getByLabelText(t.message), '   ');
    await save();
    await ios().findByText(t.saved(t.platforms.ios));
    expect(callsTo(calls, PUT_IOS)[0]?.body).toEqual({ minVersion: null, storeUrl: null, message: null, blockNow: false });
  });

  it('Android 는 자기 경로로 저장하고 iOS 는 그대로다', async () => {
    const { calls } = await open();
    await retype(android().getByLabelText(t.storeUrl), 'https://play.google.com/store/apps/details?id=app.example');
    await save(android());
    expect(await android().findByText(t.saved(t.platforms.android))).toBeInTheDocument();
    expect(callsTo(calls, PUT_ANDROID)[0]?.body).toEqual({
      minVersion: null,
      storeUrl: 'https://play.google.com/store/apps/details?id=app.example',
      message: null,
      blockNow: false,
    });
    expect(callsTo(calls, PUT_IOS)).toHaveLength(0);
    expect(ios().getByLabelText(t.minVersion)).toHaveValue('1.2.0');
  });

  it('보내기 전에 서버와 같은 규칙을 본다: 버전 · 주소 · 문구 200자', async () => {
    const { calls } = await open();
    await retype(ios().getByLabelText(t.minVersion), 'v1.2');
    await retype(ios().getByLabelText(t.storeUrl), 'http://apps.apple.com/app');
    await userEvent.click(ios().getByLabelText(t.message));
    await userEvent.paste('가'.repeat(201));
    await save();
    expect(ios().getByText(t.errors.INVALID_VERSION)).toBeInTheDocument();
    expect(ios().getByText(t.errors.INVALID_STORE_URL)).toBeInTheDocument();
    expect(ios().getByText(t.errors.INVALID_MESSAGE)).toBeInTheDocument();

    await retype(ios().getByLabelText(t.minVersion), '1.2.3.4');
    await save();
    expect(ios().getByText(t.errors.INVALID_VERSION)).toBeInTheDocument();
    await retype(ios().getByLabelText(t.minVersion), ' 1.2');
    await save();
    expect(ios().getByText(t.errors.INVALID_VERSION)).toBeInTheDocument();
    expect(callsTo(calls, PUT_IOS)).toHaveLength(0);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('안내 문구의 글자 수는 코드 포인트로 센다(이모지 한 개가 1, 앞뒤 공백은 빼고)', async () => {
    await open(platformConfig());
    await userEvent.click(ios().getByLabelText(t.message));
    await userEvent.paste(' 🙂🙂가 ');
    expect(ios().getByText(strings.common.counter(3, 200))).toBeInTheDocument();
  });

  it('즉시 차단은 최소 버전이 있어야 켤 수 있다', async () => {
    const { calls } = await open(platformConfig());
    await userEvent.click(ios().getByRole('switch', { name: t.blockNow }));
    await save();
    expect(ios().getByText(t.errors.BLOCK_REQUIRES_MIN_VERSION)).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(callsTo(calls, PUT_IOS)).toHaveLength(0);
  });

  it('즉시 차단을 켜면 먼저 묻는다: 취소하면 보내지 않고, 확인하면 blockNow: true 로 보낸다', async () => {
    const { calls } = await open();
    await userEvent.click(ios().getByRole('switch', { name: t.blockNow }));
    await save();
    const dialog = within(screen.getByRole('alertdialog', { name: t.confirm.blockTitle }));
    expect(dialog.getByText(t.confirm.blockBody('1.2.0'))).toBeInTheDocument();
    expect(t.confirm.blockBody('1.2.0')).toMatch(/1\.2\.0 미만의 앱은 업데이트 전까지 아무것도 할 수 없게/);
    await userEvent.click(dialog.getByRole('button', { name: strings.common.cancel }));
    expect(callsTo(calls, PUT_IOS)).toHaveLength(0);
    expect(ios().getByRole('switch', { name: t.blockNow })).toBeChecked();

    await save();
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: t.confirm.blockConfirm }));
    expect(await ios().findByText(t.saved(t.platforms.ios))).toBeInTheDocument();
    expect(callsTo(calls, PUT_IOS)[0]?.body).toMatchObject({ minVersion: '1.2.0', blockNow: true });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    // 이미 켜져 있으면 다시 묻지 않는다
    await retype(ios().getByLabelText(t.message), '글만 바꿔요');
    await save();
    await ios().findByText(t.saved(t.platforms.ios));
    expect(callsTo(calls, PUT_IOS)).toHaveLength(2);
  });

  it('최소 버전을 처음 정하면 스토어에 그 버전이 있는지 묻는다', async () => {
    const { calls } = await open();
    await retype(android().getByLabelText(t.minVersion), '2.0');
    await save(android());
    const dialog = within(screen.getByRole('alertdialog', { name: t.confirm.versionTitle }));
    expect(dialog.getByText(t.confirm.versionBody(t.platforms.android, '2.0'))).toBeInTheDocument();
    expect(t.confirm.versionBody(t.platforms.android, '2.0')).toMatch(/스토어/);
    await userEvent.click(dialog.getByRole('button', { name: strings.common.cancel }));
    expect(callsTo(calls, PUT_ANDROID)).toHaveLength(0);
    await save(android());
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: t.confirm.versionConfirm }));
    await android().findByText(t.saved(t.platforms.android));
    expect(callsTo(calls, PUT_ANDROID)[0]?.body).toMatchObject({ minVersion: '2.0', blockNow: false });
  });

  it('최소 버전을 올리면 묻고(숫자로 견준다), 같거나 낮추면 묻지 않는다', async () => {
    const { calls } = await open(platformConfig({ minVersion: '1.9.9' }));
    await retype(ios().getByLabelText(t.minVersion), '1.10');
    await save();
    await userEvent.click(within(screen.getByRole('alertdialog', { name: t.confirm.versionTitle })).getByRole('button', { name: t.confirm.versionConfirm }));
    await ios().findByText(t.saved(t.platforms.ios));
    expect(callsTo(calls, PUT_IOS)[0]?.body).toMatchObject({ minVersion: '1.10' });

    await retype(ios().getByLabelText(t.minVersion), '1.10.0');
    await save();
    await ios().findByText(t.saved(t.platforms.ios));
    await retype(ios().getByLabelText(t.minVersion), '1.2');
    await save();
    await ios().findByText(t.saved(t.platforms.ios));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(callsTo(calls, PUT_IOS).map((c) => (c.body as { minVersion: string }).minVersion)).toEqual(['1.10', '1.10.0', '1.2']);
  });

  it('차단이 켜진 채로 버전을 올리면 두 경고를 함께 보여 준다', async () => {
    await open(platformConfig({ minVersion: '1.0', blockNow: true }));
    await retype(ios().getByLabelText(t.minVersion), '1.1');
    await save();
    const dialog = screen.getByRole('alertdialog', { name: t.confirm.versionTitle });
    expect(dialog).toHaveTextContent(t.confirm.versionBody(t.platforms.ios, '1.1'));
    expect(dialog).toHaveTextContent(t.confirm.blockBody('1.1'));
  });

  it.each([
    ['INVALID_VERSION', t.errors.INVALID_VERSION],
    ['INVALID_STORE_URL', t.errors.INVALID_STORE_URL],
    ['INVALID_MESSAGE', t.errors.INVALID_MESSAGE],
    ['BLOCK_REQUIRES_MIN_VERSION', t.errors.BLOCK_REQUIRES_MIN_VERSION],
  ])('서버가 %s 로 거절하면 알리고 쓴 값은 그대로 둔다', async (code, text) => {
    await open(iosSet, { [PUT_IOS]: { status: 400, body: { error: code } } });
    await retype(ios().getByLabelText(t.message), '고친 글');
    await save();
    expect(await ios().findByRole('alert')).toHaveTextContent(text);
    expect(ios().getByLabelText(t.message)).toHaveValue('고친 글');
    expect(ios().getByText(t.updated(admin.name, '2026-11-12 15:00'))).toBeInTheDocument();
  });
});
