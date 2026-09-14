import { FiAlertTriangle, FiWifiOff } from 'react-icons/fi';
import { Button } from './Button';

export function ErrorState({
  message,
  onRetry,
  network = false,
}: {
  message: string;
  onRetry?: () => void;
  network?: boolean;
}) {
  const Icon = network ? FiWifiOff : FiAlertTriangle;
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-md border border-danger-500/20 bg-danger-50 py-10 text-center text-danger-600"
    >
      <Icon className="text-2xl" aria-hidden />
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
