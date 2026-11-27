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
  /** true while the person is still on a temporary password. */
  mustChangePassword: z.boolean(),
  /** LOCK-37 position; null for Controller, Admin and Founder. */
  position: z.string().nullable().optional(),
});
const userResponseSchema = z.object({ user: userSchema });

export type CurrentUser = z.infer<typeof userSchema>;

/** POST /auth/login. On success the server also sets the session cookie. */
export async function login(email: string, password: string): Promise<CurrentUser> {
  const { data } = await apiClient.post<unknown>('/auth/login', { email, password });
  return userResponseSchema.parse(data).user;
}

/** POST /auth/password. The server ends every other session and sends a fresh cookie. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<CurrentUser> {
  const { data } = await apiClient.post<unknown>('/auth/password', {
    currentPassword,
    newPassword,
  });
  return userResponseSchema.parse(data).user;
}

/**
 * POST /auth/step-up. Before a sensitive action (like changing a margin) the person types their password again.
 * The server then allows such actions from this session for 5 minutes. A wrong password is an ApiError.
 */
export async function confirmPassword(password: string): Promise<void> {
  await apiClient.post('/auth/step-up', { password });
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
