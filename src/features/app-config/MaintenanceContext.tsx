import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/icons';
import { strings } from '../../content/strings';
import type { Maintenance } from '../../lib/api/types';
import { formatKst } from '../../lib/text';
import { useAuth } from '../auth/AuthContext';

interface MaintenanceValue {
  /** 지금 점검 값. 아직 받지 못했거나 받지 못했으면 null 이다. */
  maintenance: Maintenance | null;
  /** 점검이 켜져 있다. 아직 받지 못했거나 받지 못했으면 false 다. */
  active: boolean;
  /** 앱 설정 화면이 받아 오거나 저장한 값을 알려 준다. */
  report: (maintenance: Maintenance) => void;
}

// 화면 틀 밖(화면 하나만 그리는 테스트 등)에서는 알림을 받는 곳이 없을 뿐이다.
const MaintenanceContext = createContext<MaintenanceValue>({ maintenance: null, active: false, report: () => undefined });

/** 결정 002: 점검 상태 한 값만 화면 틀이 가진다. 로그인한 뒤 한 번 받고, 그 뒤로는 앱 설정 화면이 알려 줄 때만 바뀐다. */
export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const { api } = useAuth();
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);
  const reported = useRef(false);

  useEffect(() => {
    let stale = false;
    api.getAppConfig().then(
      (config) => {
        // 그 사이 앱 설정 화면이 더 새 값을 알려 줬으면 덮어쓰지 않는다.
        if (!stale && !reported.current) setMaintenance(config.maintenance);
      },
      () => {
        // 받지 못하면 띠를 보이지 않는다. 오류는 앱 설정 화면이 알린다(401 은 공통 처리가 로그인 화면으로 보낸다).
      },
    );
    return () => {
      stale = true;
    };
  }, [api]);

  const report = useCallback((next: Maintenance) => {
    reported.current = true;
    setMaintenance(next);
  }, []);

  const value = useMemo(() => ({ maintenance, active: maintenance?.active ?? false, report }), [maintenance, report]);
  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
}

export const useMaintenance = (): MaintenanceValue => useContext(MaintenanceContext);

/**
 * 점검이 켜져 있는 동안 모든 화면 위에 보이는 노란 띠(D24).
 * 켠 때 · 켠 관리자는 결정 043 의 7(startedAt · startedBy), 서버가 아직 주지 않으면 마지막 수정(updatedAt · updatedBy).
 */
export function MaintenanceBanner() {
  const { maintenance } = useMaintenance();
  if (!maintenance?.active) return null;
  const t = strings.shell.maintenance;
  return (
    <div className="banner" role="status">
      <span className="banner__dot" aria-hidden="true" />
      <strong className="banner__title">{t.title}</strong>
      {/* 데스크톱은 한 줄, 폰은 세 줄(이름표 · 링크 / 설명 / 시작 시각 · 켠 관리자) — 시안 v184 */}
      <span className="banner__body">
        <span>{t.body}</span>{' '}
        <span className="banner__since">{t.since(formatKst(maintenance.startedAt ?? maintenance.updatedAt), (maintenance.startedBy ?? maintenance.updatedBy)?.name ?? null)}</span>
      </span>
      <Link className="banner__link" to="/app-config">
        {t.link}
        <Icon name="right" size={16} />
      </Link>
    </div>
  );
}
