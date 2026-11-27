import { apiClient } from '@/services/api/client';

/**
 * Downloads a file the server builds (a CSV register or a PDF) and saves it through the browser.
 * It goes through the same client as every other call, so the sign-in cookie is sent and a failure
 * (for example "Add the company details first") comes back as a normal ApiError with the server's message.
 */

/** The file name in the server's Content-Disposition header: attachment; filename="x.csv". */
function nameFromHeader(header: unknown): string | null {
  return typeof header === 'string' ? (/filename="([^"]+)"/.exec(header)?.[1] ?? null) : null;
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export interface DownloadRequest {
  /** The API path, like '/reports/sales-register'. */
  path: string;
  /** Query parameters; empty ones are left out. */
  params?: Record<string, string | number>;
  /** Used when the server does not say a file name. */
  fallbackName: string;
}

export async function downloadFile({ path, params = {}, fallbackName }: DownloadRequest) {
  const wanted = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== ''));
  const response = await apiClient.get<Blob>(path, { params: wanted, responseType: 'blob' });
  saveBlob(response.data, nameFromHeader(response.headers['content-disposition']) ?? fallbackName);
}
