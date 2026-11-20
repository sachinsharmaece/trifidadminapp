import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import { ApiError } from '@/services/api/ApiError';
import { ROLES } from '@/types/roles';

/** The signed-in person, as the server describes them. */
const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(ROLES),
});
const userResponseSchema = z.object({ user: userSchema });

export type CurrentUser = z.infer<typeof userSchema>;

/** POST /auth/login. On success the server also sets the session cookie. */
export async function login(email: string, password: string): Promise<CurrentUser> {
  const { data } = await apiClient.post<unknown>('/auth/login', { email, password });
  return userResponseSchema.parse(data).user;
}

/** POST /auth/logout. The server deletes the session and the cookie. */
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

/** GET /me: who is signed in? Returns null (not an error) when nobody is. */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<CurrentUser | null> {
  try {
    const { data } = await apiClient.get<unknown>('/me', { signal });
    return userResponseSchema.parse(data).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
