import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * A reference screen that this copy has not built yet. `build` says in which step of the copy it comes
 * (R2 Purchase desk … R9 portal). Removed screen by screen as the copy grows.
 */
export function ComingSoonPage({ title, build }: { title: string; build: string }) {
  useDocumentTitle(title);
  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">{title}</h1>
      <p className="rounded border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500">
        This screen comes in build {build} of the reference copy.
      </p>
    </div>
  );
}
