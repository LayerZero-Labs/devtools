/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable jest/expect-expect */
import { OmniPoint } from '@/omnigraph'
import { WithLooseBigInts } from '@/types'
import { EndpointId } from '@layerzerolabs/lz-definitions'

describe('types', () => {
    describe('WithLooseBigInts', () => {
        const point: OmniPoint = { eid: EndpointId.ZORA_TESTNET, address: '' }

        it('should transform bigint into PossiblyBigint', () => {
            type Test = WithLooseBigInts<bigint>

            const str: Test = ''
            const num: Test = 6
            const big: Test = BigInt(69)

            // @ts-expect-error objects should not pass
            const obj: Test = {}
            // @ts-expect-error arrays should not pass
            const arr: Test = []
            // @ts-expect-error booleans should not pass
            const bool: Test = false
            // @ts-expect-error symbols should not pass
            const sym: Test = Symbol()
        })

        it('should transform array', () => {
            type Test = WithLooseBigInts<bigint[]>

            const str: Test = ['', '1']
            const num: Test = [7, 15]
            const big: Test = [BigInt(8), BigInt(87)]
            const mixed: Test = ['', 6, BigInt(112)]

            // @ts-expect-error objects should not pass
            const obj: Test = [{}]
            // @ts-expect-error arrays should not pass
            const arr: Test = [[]]
            // @ts-expect-error booleans should not pass
            const bool: Test = [false]
            // @ts-expect-error symbols should not pass
            const sym: Test = [Symbol()]
        })

        it('should transform tuple', () => {
            type Test = WithLooseBigInts<[bigint, string, boolean]>

            const str: Test = ['', 'string', false]
            const num: Test = [17, 'string', false]
            const big: Test = [BigInt(50), 'string', true]

            // @ts-expect-error objects should not pass
            const obj: Test = [{}, 'string', false]
            // @ts-expect-error wrong tuple length should not pass
            const short: Test = [87]
            // @ts-expect-error wrong tuple types should not pass
            const mistyped: Test = [87, 65, true]
        })

        it('should transform interface', () => {
            type Test = WithLooseBigInts<{ big: bigint; str: string; arr: unknown[] }>

            const str: Test = { big: 'string', str: '', arr: [] }
            const num: Test = { big: 6, str: '', arr: [] }
            const big: Test = { big: BigInt(654), str: '', arr: [] }

            // @ts-expect-error objects should not pass
            const obj: Test = { big: {}, str: '', arr: [] }
            // @ts-expect-error arrays should not pass
            const arr: Test = { big: [], str: '', arr: [] }
            // @ts-expect-error wrong interface types should not pass
            const mistyped: Test = { big: [], str: 6, arr: [] }
        })
    })
})
