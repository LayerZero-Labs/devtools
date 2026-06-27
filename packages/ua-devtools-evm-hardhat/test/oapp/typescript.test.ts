import { createPrinter, createSourceFile, EmitHint, Node, ScriptTarget } from 'typescript'
import { creatUlnConfig } from '@/oapp/typescript/typescript'
import { NIL_CONFIRMATIONS, NIL_DVN_COUNT, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'

const DVN = '0x0000000000000000000000000000000000000001'
const DVN2 = '0x0000000000000000000000000000000000000002'

const print = (node: Node): string =>
    createPrinter()
        .printNode(EmitHint.Unspecified, node, createSourceFile('test.ts', '', ScriptTarget.Latest))
        .replace(/\s+/g, ' ')

// Chain-shaped config (what the generator reads). Defaults to the all-inherit state
// (counts 0, confirmations 0) so each test overrides only the field(s) under test.
const chainConfig = (over: Partial<Uln302UlnConfig> = {}): Uln302UlnConfig => ({
    confirmations: BigInt(0),
    requiredDVNs: [],
    requiredDVNCount: 0,
    optionalDVNs: [],
    optionalDVNCount: 0,
    optionalDVNThreshold: 0,
    ...over,
})

describe('oapp/typescript creatUlnConfig', () => {
    it('omits every field that inherits the on-chain default (count 0, confirmations 0)', () => {
        const out = print(creatUlnConfig(chainConfig()))

        expect(out).not.toContain('confirmations')
        expect(out).not.toContain('requiredDVNs')
        expect(out).not.toContain('optionalDVNs')
    })

    it('emits the pin-none sentinels back as `[]` / `0n` so they re-serialize to NIL', () => {
        const out = print(
            creatUlnConfig(
                chainConfig({
                    confirmations: NIL_CONFIRMATIONS,
                    requiredDVNCount: NIL_DVN_COUNT,
                    optionalDVNCount: NIL_DVN_COUNT,
                })
            )
        )

        expect(out).toContain('confirmations: 0')
        expect(out).toMatch(/requiredDVNs: \[\s*\]/)
        expect(out).toMatch(/optionalDVNs: \[\s*\]/)
    })

    it('emits concrete values and arrays unchanged', () => {
        const out = print(
            creatUlnConfig(
                chainConfig({
                    confirmations: BigInt(15),
                    requiredDVNs: [DVN],
                    requiredDVNCount: 1,
                    optionalDVNs: [DVN2],
                    optionalDVNCount: 1,
                    optionalDVNThreshold: 1,
                })
            )
        )

        expect(out).toContain('confirmations: 15')
        expect(out).toContain(DVN)
        expect(out).toContain(DVN2)
        expect(out).toContain('optionalDVNThreshold: 1')
    })
})
