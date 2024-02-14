import { UIntBigIntSchema } from '@layerzerolabs/devtools'
import { z } from 'zod'

export const QuoteOutputSchema = z.object({
    nativeFee: UIntBigIntSchema,
    lzTokenFee: UIntBigIntSchema,
})
