import { getExamples } from '@/config'

describe('config', () => {
    describe('getExamples()', () => {
        it('should use the default repository if LAYERZERO_EXAMPLES_REPOSITORY_URL is empty', () => {
            process.env.LAYERZERO_EXAMPLES_REPOSITORY_URL = ''

            const examples = getExamples()
            expect(examples).not.toEqual([])

            examples.forEach((example) =>
                expect(example).toMatchObject({ repository: 'https://github.com/LayerZero-Labs/devtools.git' })
            )
        })

        it('should use LAYERZERO_EXAMPLES_REPOSITORY_URL if LAYERZERO_EXAMPLES_REPOSITORY_URL is defined', () => {
            process.env.LAYERZERO_EXAMPLES_REPOSITORY_URL = 'my://little.devtools'

            const examples = getExamples()
            expect(examples).not.toEqual([])

            examples.forEach((example) => expect(example).toMatchObject({ repository: 'my://little.devtools' }))
        })

        it('should use the default ref if LAYERZERO_EXAMPLES_REPOSITORY_REF is empty', () => {
            process.env.LAYERZERO_EXAMPLES_REPOSITORY_REF = ''

            const examples = getExamples()
            expect(examples).not.toEqual([])

            examples.forEach((example) => expect(example).toMatchObject({ ref: '' }))
        })

        it('should use LAYERZERO_EXAMPLES_REPOSITORY_REF if LAYERZERO_EXAMPLES_REPOSITORY_REF is defined', () => {
            process.env.LAYERZERO_EXAMPLES_REPOSITORY_REF = 'ohhello'

            const examples = getExamples()
            expect(examples).not.toEqual([])

            examples.forEach((example) => expect(example).toMatchObject({ ref: 'ohhello' }))
        })

        it('should not include Solana OFT example if LZ_ENABLE_SOLANA_OFT_EXAMPLE is empty', () => {
            process.env.LZ_ENABLE_SOLANA_OFT_EXAMPLE = ''

            expect(getExamples()).not.toContainEqual(expect.objectContaining({ id: 'oft-solana' }))
        })

        it('should include Solana OFT example if LZ_ENABLE_SOLANA_OFT_EXAMPLE is defined', () => {
            process.env.LZ_ENABLE_SOLANA_OFT_EXAMPLE = 'yes'

            expect(getExamples()).toContainEqual(expect.objectContaining({ id: 'oft-solana' }))
        })

        it('should not include OApp Read example if LZ_ENABLE_READ_EXAMPLE is empty', () => {
            process.env.LZ_ENABLE_READ_EXAMPLE = ''

            expect(getExamples()).not.toContainEqual(expect.objectContaining({ id: 'oapp-read' }))
        })

        it('should include OApp Read example if LZ_ENABLE_READ_EXAMPLE is defined', () => {
            process.env.LZ_ENABLE_READ_EXAMPLE = 'yes'

            expect(getExamples()).toContainEqual(expect.objectContaining({ id: 'oapp-read' }))
        })
    })
})
