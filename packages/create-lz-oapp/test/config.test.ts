import { getExamples } from '@/config'

const DEFAULT_REPO = 'https://github.com/LayerZero-Labs/devtools.git'
const DEFAULT_BRANCH = 'main'
const CUSTOM_BRANCH = 'test/omnicall-new-createlzoapp'

describe('config', () => {
    describe('getExamples()', () => {
        it('should use the default repository', async () => {
            const examples = await getExamples()
            expect(examples).not.toEqual([])

            examples.forEach((example) => expect(example).toMatchObject({ repository: DEFAULT_REPO }))
        })

        it('should use the branch parameter if provided', async () => {
            const examples = await getExamples()
            expect(examples).not.toEqual([])

            examples.forEach((example) => expect(example).toMatchObject({ ref: DEFAULT_BRANCH }))
        })

        it('should use branch parameter if provided', async () => {
            const examples = await getExamples(CUSTOM_BRANCH)
            expect(examples).not.toEqual([])

            examples.forEach((example) => expect(example).toMatchObject({ ref: CUSTOM_BRANCH }))
        })

        it('should use branch parameter and repo if provided', async () => {
            const examples = await getExamples(CUSTOM_BRANCH, DEFAULT_REPO)
            expect(examples).not.toEqual([])

            examples.forEach((example) => expect(example).toMatchObject({ ref: CUSTOM_BRANCH }))
        })

        it('should extract branch name from GitHub URL with /tree/', async () => {
            const examples = await getExamples(`https://github.com/LayerZero-Labs/devtools/tree/${CUSTOM_BRANCH}`)
            expect(examples).not.toEqual([])

            examples.forEach((example) => expect(example).toMatchObject({ ref: CUSTOM_BRANCH }))
        })

        it('should extract complex branch path from GitHub URL', async () => {
            const examples = await getExamples(`https://github.com/LayerZero-Labs/devtools/tree/${CUSTOM_BRANCH}`)
            expect(examples).not.toEqual([])

            examples.forEach((example) => expect(example).toMatchObject({ ref: CUSTOM_BRANCH }))
        })

        it('should extract branch name from GitHub URL with /blob/', async () => {
            const examples = await getExamples(`https://github.com/LayerZero-Labs/devtools/blob/${CUSTOM_BRANCH}`)
            expect(examples).not.toEqual([])

            examples.forEach((example) => expect(example).toMatchObject({ ref: CUSTOM_BRANCH }))
        })

        it('should not include Solana OFT example if LZ_ENABLE_SOLANA_OFT_EXAMPLE is empty', async () => {
            process.env.LZ_ENABLE_SOLANA_OFT_EXAMPLE = ''

            expect(await getExamples()).not.toContainEqual(expect.objectContaining({ id: 'oft-solana' }))
        })

        it('should include Solana OFT example if LZ_ENABLE_SOLANA_OFT_EXAMPLE is defined', async () => {
            process.env.LZ_ENABLE_SOLANA_OFT_EXAMPLE = 'yes'

            expect(await getExamples()).toContainEqual(expect.objectContaining({ id: 'oft-solana' }))
        })

        it('should include Solana OFT example if LZ_ENABLE_SOLANA_OFT_EXAMPLE is "true"', async () => {
            process.env.LZ_ENABLE_SOLANA_OFT_EXAMPLE = 'true'

            expect(await getExamples()).toContainEqual(expect.objectContaining({ id: 'oft-solana' }))
        })

        it('should include Solana OFT example if LZ_ENABLE_SOLANA_OFT_EXAMPLE is "1"', async () => {
            process.env.LZ_ENABLE_SOLANA_OFT_EXAMPLE = '1'

            expect(await getExamples()).toContainEqual(expect.objectContaining({ id: 'oft-solana' }))
        })

        it('should not include OApp Read example if LZ_ENABLE_READ_EXAMPLE is empty', async () => {
            process.env.LZ_ENABLE_READ_EXAMPLE = ''

            expect(await getExamples()).not.toContainEqual(expect.objectContaining({ id: 'oapp-read' }))
        })

        it('should include OApp Read example if LZ_ENABLE_READ_EXAMPLE is defined', async () => {
            process.env.LZ_ENABLE_READ_EXAMPLE = 'yes'

            expect(await getExamples()).toContainEqual(expect.objectContaining({ id: 'oapp-read' }))
        })

        it('should include OApp Read example if LZ_ENABLE_READ_EXAMPLE is "true"', async () => {
            process.env.LZ_ENABLE_READ_EXAMPLE = 'true'

            expect(await getExamples()).toContainEqual(expect.objectContaining({ id: 'oapp-read' }))
        })

        it('should include OApp Read example if LZ_ENABLE_READ_EXAMPLE is "1"', async () => {
            process.env.LZ_ENABLE_READ_EXAMPLE = '1'

            expect(await getExamples()).toContainEqual(expect.objectContaining({ id: 'oapp-read' }))
        })

        it('should accept logLevel parameter', async () => {
            // This test just ensures the function accepts the logLevel parameter without error
            const examples = await getExamples(undefined, 'debug')
            expect(examples).not.toEqual([])
        })
    })
})
