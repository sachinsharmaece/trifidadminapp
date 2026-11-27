import { useState } from 'react';
import { ChoicePicker } from '@/components/molecules/ChoicePicker';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { LedgerChoice } from './api';
import { useLedgerChoices } from './hooks';

/** Picks the ledger for one journal line: type a few letters of its name, click the one you mean. */
export function LedgerPicker(props: {
  text: string;
  onTextChange: (text: string) => void;
  onPick: (choice: LedgerChoice) => void;
  invalid?: boolean;
  label: string;
}) {
  const debounced = useDebouncedValue(props.text.trim(), 250);
  const [asked, setAsked] = useState(false);
  const choices = useLedgerChoices(asked ? debounced : '');
  return (
    <ChoicePicker
      aria-label={props.label}
      invalid={props.invalid ?? false}
      text={props.text}
      onTextChange={(text) => {
        setAsked(true);
        props.onTextChange(text);
      }}
      // Only what matches the words in the box (the list from the last search may still be on screen).
      options={(choices.data ?? []).filter((choice) =>
        choice.name.toLowerCase().includes(props.text.trim().toLowerCase()),
      )}
      loading={choices.isFetching}
      optionKey={(choice) =>
        choice.kind === 'LEDGER' ? choice.ledgerId : `${choice.side}-${choice.id}`
      }
      optionLabel={(choice) =>
        choice.kind === 'LEDGER' ? `${choice.name} · ${choice.group}` : choice.name
      }
      onPick={props.onPick}
      placeholder="Type to find a ledger"
    />
  );
}
