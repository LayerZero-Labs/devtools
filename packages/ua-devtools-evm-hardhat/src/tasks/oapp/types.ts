import type { OmniGraphHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import type { ZodType, ZodTypeDef } from 'zod/lib/types'

export * from './wire/types'

export interface SubtaskLoadConfigTaskArgs {
    configPath: string
    schema: ZodType<OmniGraphHardhat, ZodTypeDef, unknown>
    task: string
}
