import { refSend } from '@/lib/refApi';

/** Reads a picked file and uploads it (POST /uploads, base64). Returns the new file id. */
export async function uploadFile(file: File): Promise<string> {
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === 'string' ? (reader.result.split(',')[1] ?? '') : '');
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
  const res = await refSend<{ fileId: string }>('POST', '/uploads', {
    name: file.name,
    contentType: file.type,
    dataBase64,
  });
  if (!res.ok) throw new Error(res.message);
  return res.data.fileId;
}

/**
 * A labelled, button-like file picker at least 44 px tall, copied from the reference (components/forms/FileField.tsx).
 * `capture` opens the camera straight away on a phone.
 */
export function FileField({
  label,
  accept,
  onFile,
  fileName,
  capture,
}: {
  label: string;
  accept: string;
  onFile: (file: File) => void;
  fileName: string | null;
  capture?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-600">
      {label}
      <span className="relative flex min-h-11 w-full items-center justify-between rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-700">
        <span>{fileName ?? 'Choose file…'}</span>
        <input
          aria-label={label}
          type="file"
          accept={accept}
          capture={capture ? 'environment' : undefined}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
    </label>
  );
}
