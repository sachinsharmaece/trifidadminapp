import { useState, type ComponentProps } from 'react';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';

type PasswordFieldProps = Omit<ComponentProps<typeof Input>, 'type'>;

/** A password input with a show/hide button. Use it inside <FormField> like a normal <Input>. */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-10" />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-slate-500 hover:text-slate-700"
      >
        <Icon name={visible ? 'eye-off' : 'eye'} />
      </button>
    </div>
  );
}
