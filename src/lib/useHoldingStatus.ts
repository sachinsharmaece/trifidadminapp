import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getHoldingStatus, type HoldingStatus } from '../api/holding';

const OFF: HoldingStatus = {
  enabled: false,
  isCaller: false,
  isTeamLeader: false,
  uncalledCap: 50,
};

/**
 * LOCK-34 — whether the holding rules are on, and what the signed-in person is
 * (a caller, a Team Leader). Until it answers — and if it cannot — everything
 * reads as OFF, so a screen looks exactly as it did before the feature.
 */
export function useHoldingStatus(): HoldingStatus {
  const { callApi, me } = useAuth();
  const [status, setStatus] = useState<HoldingStatus>(OFF);
  useEffect(() => {
    if (!me) return;
    let live = true;
    callApi((token) => getHoldingStatus(token))
      .then((next) => {
        if (live) setStatus(next);
      })
      .catch(() => {
        /* off: nothing new is shown */
      });
    return () => {
      live = false;
    };
  }, [callApi, me]);
  return status;
}
