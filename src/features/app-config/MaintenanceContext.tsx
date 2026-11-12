import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { strings } from '../../content/strings';
import type { Maintenance } from '../../lib/api/types';
import { useAuth } from '../auth/AuthContext';

interface MaintenanceValue {
  /** 점검이 켜져 있다. 아직 받지 못했거나 받지 못했으면 false 다. */
  active: boolean;
  /** 앱 설정 화면이 받아 오거나 저장한 값을 알려 준다. */
  report: (maintenance: Maintenance) => void;
}

// 화면 틀 밖(화면 하나만 그리는 테스트 등)에서는 알림을 받는 곳이 없을 뿐이다.
const MaintenanceContext = createContext<MaintenanceValue>({ active: false, report: () => undefined });

/** 결정 002: 점검 상태 한 값만 화면 틀이 가진다. 로그인한 뒤 한 번 받고, 그 뒤로는 앱 설정 화면이 알려 줄 때만 바뀐다. */
export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const { api } = useAuth();
  const [active, setActive] = useState(false);
  const reported = useRef(false);

  useEffect(() => {
    let stale = false;
    api.getAppConfig().then(
      (config) => {
        // 그 사이 앱 설정 화면이 더 새 값을 알려 줬으면 덮어쓰지 않는다.
        if (!stale && !reported.current) setActive(config.maintenance.active);
      },
      () => {
        // 받지 못하면 띠를 보이지 않는다. 오류는 앱 설정 화면이 알린다(401 은 공통 처리가 로그인 화면으로 보낸다).
      },
    );
    return () => {
      stale = true;
    };
  }, [api]);

  const report = useCallback((maintenance: Maintenance) => {
    reported.current = true;
    setActive(maintenance.active);
  }, []);

  const value = useMemo(() => ({ active, report }), [active, report]);
  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
}

export const useMaintenance = (): MaintenanceValue => useContext(MaintenanceContext);

/** 점검이 켜져 있는 동안 모든 화면 위에 보이는 띠 */
export function MaintenanceBanner() {
  const { active } = useMaintenance();
  if (!active) return null;
  return (
    <p className="banner" role="status">
      <strong>{strings.shell.maintenanceBanner}</strong>
      <Link to="/app-config">{strings.shell.maintenanceLink}</Link>
    </p>
  );
}
