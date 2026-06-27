import { createPrinter, createSourceFile, EmitHint, Node, ScriptTarget } from 'typescript'
import { createReadUlnConfig } from '@/oapp-read/typescript/typescript'
import { NIL_DVN_COUNT, UlnReadUlnConfig } from '@layerzerolabs/protocol-devtools'

const EXECUTOR = '0x0000000000000000000000000000000000000009'
const DVN = '0x0000000000000000000000000000000000000001'
const DVN2 = '0x0000000000000000000000000000000000000002'

const print = (node: Node): string =>
    createPrinter()
        .printNode(EmitHint.Unspecified, node, createSourceFile('test.ts', '', ScriptTarget.Latest))
        .replace(/\s+/g, ' ')

// Chain-shaped read config. Defaults to the all-inherit state (counts 0) so each test
// overrides only the field(s) under test.
const readConfig = (over: Partial<UlnReadUlnConfig> = {}): UlnReadUlnConfig => ({
    executor: EXECUTOR,
    requiredDVNs: [],
    requiredDVNCount: 0,
    optionalDVNs: [],
    optionalDVNCount: 0,
    optionalDVNThreshold: 0,
    ...over,
})

describe('oapp-read/typescript createReadUlnConfig', () => {
    it('emits only executor when both DVN sets inherit the default (count 0)', () => {
        const out = print(createReadUlnConfig(readConfig()))

        expect(out).toContain('executor')
        expect(out).not.toContain('requiredDVNs')
        expect(out).not.toContain('optionalDVNs')
    })

    it('emits the pin-none sentinels back as `[]` so they re-serialize to NIL', () => {
        const out = print(
            createReadUlnConfig(readConfig({ requiredDVNCount: NIL_DVN_COUNT, optionalDVNCount: NIL_DVN_COUNT }))
        )

        expect(out).toMatch(/requiredDVNs: \[\s*\]/)
        expect(out).toMatch(/optionalDVNs: \[\s*\]/)
    })

    it('emits concrete arrays and the optional threshold unchanged', () => {
        const out = print(
            createReadUlnConfig(
                readConfig({
                    requiredDVNs: [DVN],
                    requiredDVNCount: 1,
                    optionalDVNs: [DVN2],
                    optionalDVNCount: 1,
                    optionalDVNThreshold: 2,
                })
            )
        )

        expect(out).toContain(DVN)
        expect(out).toContain(DVN2)
        expect(out).toContain('optionalDVNThreshold: 2')
    })
})
