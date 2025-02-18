import { z } from 'zod'

export const BytesSchema = z.string().startsWith('0x')
