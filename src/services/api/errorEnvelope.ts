import { z } from 'zod';

/**
 * The JSON body trifidserverapp sends with every failed response:
 *   { "error": { "code": "NOT_FOUND", "message": "...", "details": ..., "requestId": "..." } }
 */
export const apiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});

export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>;
