import { SetConfigType } from '@layerzerolabs/lz-solana-sdk-v2'
import { SetConfigSchema } from '@/endpointv2/schema'

const NIL_DVN_COUNT = 255
const NIL_CONFIRMATIONS = (BigInt(1) << BigInt(64)) - BigInt(1)
const DVN = '4VDjp6XQaxoZf5RGwiPU9NR1EXSZn2TP4ATMmiSzLfhb'

describe('endpointv2/schema SetConfigSchema (solana)', () => {
    const parse = (confirmations: bigint, optionalDVNCount: number) =>
        SetConfigSchema.parse({
            configType: SetConfigType.SEND_ULN,
            config: {
                confirmations,
                optionalDVNThreshold: 0,
                requiredDVNs: [DVN],
                requiredDVNCount: 1,
                optionalDVNs: [],
                optionalDVNCount,
            },
        })

    it('encodes NIL_CONFIRMATIONS (u64 max) as a BN without precision loss', () => {
        const parsed: any = parse(NIL_CONFIRMATIONS, 0)
        // A plain Number(NIL_CONFIRMATIONS) would lose precision; the BN must round-trip exactly.
        expect(parsed.config.confirmations.toString()).toBe(NIL_CONFIRMATIONS.toString())
    })

    it('passes a regular confirmations value through as a BN', () => {
        const parsed: any = parse(BigInt(32), 0)
        expect(parsed.config.confirmations.toString()).toBe('32')
    })

    it('forwards the optional DVN NIL sentinel rather than recomputing from the array length', () => {
        const parsed: any = parse(BigInt(32), NIL_DVN_COUNT)
        expect(parsed.config.optionalDvnCount).toBe(NIL_DVN_COUNT)
    })
})
