import { describe, expect, it } from 'vitest';
import { strings } from '../../content/strings';
import { AUDIT_ADMIN_ACTIONS, AUDIT_USER_ACTIONS } from '../../lib/api/types';
import { actionLabel, actorTypeLabel, detailChips, outcomeLabel, targetLabel } from './labels';

const chip = strings.audit.detail.chip;

describe('감사 로그의 문구', () => {
  it('계약의 행동 코드는 서른 개다(관리자 18 · 사용자 12)', () => {
    expect(AUDIT_ADMIN_ACTIONS).toHaveLength(18);
    expect(AUDIT_USER_ACTIONS).toHaveLength(12);
    expect(new Set([...AUDIT_ADMIN_ACTIONS, ...AUDIT_USER_ACTIONS]).size).toBe(30);
  });

  it.each([...AUDIT_ADMIN_ACTIONS, ...AUDIT_USER_ACTIONS])('%s 에 한국어 이름이 있다', (code) => {
    expect(actionLabel(code)).not.toBe(code);
    expect(actionLabel(code)).toMatch(/[가-힣]/);
  });

  it('문구에는 계약에 없는 행동 코드가 없다', () => {
    expect(Object.keys(strings.audit.actions).sort()).toEqual([...AUDIT_ADMIN_ACTIONS, ...AUDIT_USER_ACTIONS].sort());
  });

  it('모르는 코드는 받은 그대로 보인다(물려받은 이름에도 속지 않는다)', () => {
    expect(actionLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
    expect(actionLabel('constructor')).toBe('constructor');
    expect(actorTypeLabel('ROBOT')).toBe('ROBOT');
    expect(targetLabel('PAYMENT')).toBe('PAYMENT');
    expect(outcomeLabel('PARTIAL')).toBe('PARTIAL');
    expect(actorTypeLabel('USER')).toBe('사용자');
    expect(targetLabel('APP_CONFIG')).toBe('앱 설정');
    expect(outcomeLabel('FAILURE')).toBe('실패');
  });

  it('detail: 계약의 키와 값을 한국어로 바꾼다', () => {
    expect(detailChips(null)).toEqual([]);
    expect(detailChips({})).toEqual([]);
    expect(detailChips({ status: 'DONE', memoChanged: true })).toEqual([chip('상태', '끝남'), chip('메모', '바뀜')]);
    expect(detailChips({ memoChanged: false })).toEqual([chip('메모', '그대로')]);
    expect(detailChips({ published: false })).toEqual([chip('공개 여부', '비공개')]);
    expect(detailChips({ count: 7 })).toEqual([chip('개수', '7')]);
    expect(detailChips({ platform: 'ios', minVersion: '1.2.0', blockNow: true })).toEqual([
      chip('플랫폼', 'iOS'),
      chip('최소 버전', '1.2.0'),
      chip('즉시 차단', '켬'),
    ]);
    expect(detailChips({ active: false })).toEqual([chip('점검', '끔')]);
    expect(detailChips({ change: 'CREATED' })).toEqual([chip('저장', '처음 저장')]);
    expect(detailChips({ relation: 'FAMILY' })).toEqual([chip('관계', '가족')]);
    expect(detailChips({ topic: 'FUTURE' })).toEqual([chip('주제', '미래')]);
    expect(detailChips({ kind: 'NEXT_TURN' })).toEqual([chip('공유 종류', '다음 시기')]);
    expect(detailChips({ category: 'BUG' })).toEqual([chip('문의 종류', '오류')]);
  });

  it('detail: 모르는 키와 값은 받은 그대로 보인다', () => {
    expect(detailChips({ newKey: 'X1' })).toEqual([chip('newKey', 'X1')]);
    expect(detailChips({ status: 'ON_HOLD', relation: 'RIVAL' })).toEqual([chip('상태', 'ON_HOLD'), chip('관계', 'RIVAL')]);
    expect(detailChips({ toString: 'x', extra: null, nested: { a: 1 } })).toEqual([
      chip('toString', 'x'),
      chip('extra', 'null'),
      chip('nested', '{"a":1}'),
    ]);
  });
});
