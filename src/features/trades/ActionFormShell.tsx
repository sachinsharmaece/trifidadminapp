import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';

interface ActionFormShellProps {
  title: string;
  /** One line under the title: what pressing the button will do. */
  description: string;
  submitLabel: string;
  pending: boolean;
  error: string | undefined;
  onSubmit: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

/** The frame every deal-card button form shares: title, what it does, the fields, Save and Cancel. */
export function ActionFormShell(props: ActionFormShellProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    props.onSubmit();
  }
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-lg border border-brand-200 bg-white p-5"
    >
      <div>
        <h3 className="text-base font-semibold">{props.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{props.description}</p>
      </div>
      <ErrorAlert message={props.error} />
      {props.children}
      <div className="flex gap-2">
        <Button type="submit" loading={props.pending}>
          {props.submitLabel}
        </Button>
        <Button variant="ghost" onClick={props.onCancel} disabled={props.pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
