import { importDefault, isFile } from '@/filesystem'
import { resolve } from 'path'

describe('filesystem/filesystem', () => {
    describe('importDefault', () => {
        const CONFIGS_BASE_DIR = resolve(__dirname, '__data__', 'importDefault')
        const configPathFixture = (fileName: string): string => {
            const path = resolve(CONFIGS_BASE_DIR, fileName)

            expect(isFile(path)).toBeTruthy()

            return path
        }

        it('should work with an empty JS file', async () => {
            const fileName = configPathFixture('empty.js')

            await expect(importDefault(fileName)).resolves.toMatchSnapshot()
        })

        it('should work with a JSON file', async () => {
            const fileName = configPathFixture('object.json')

            await expect(importDefault(fileName)).resolves.toMatchSnapshot()
        })

        it('should not work with an empty JSON file', async () => {
            const fileName = configPathFixture('empty.json')

            await expect(importDefault(fileName)).rejects.toMatchSnapshot()
        })

        it('should not work with a non-JS compatible file', async () => {
            const fileName = configPathFixture('nonsense.md')

            await expect(importDefault(fileName)).rejects.toMatchSnapshot()
        })

        it('should work with a JS/CJS file', async () => {
            const fileName = configPathFixture('object.cjs.js')

            await expect(importDefault(fileName)).resolves.toMatchSnapshot()
        })

        it('should work with a JS/ESM file', async () => {
            const fileName = configPathFixture('object.esm.js')

            await expect(importDefault(fileName)).resolves.toMatchSnapshot()
        })

        it('should work with a TS/CJS file', async () => {
            const fileName = configPathFixture('object.cjs.ts')

            await expect(importDefault(fileName)).resolves.toMatchSnapshot()
        })

        it('should work with an TS/ESM file', async () => {
            const fileName = configPathFixture('object.esm.ts')

            await expect(importDefault(fileName)).resolves.toMatchSnapshot()
        })

        it('should work with an TS/ESM file without a default export', async () => {
            const fileName = configPathFixture('without-default.ts')

            await expect(importDefault(fileName)).resolves.toMatchSnapshot()
        })

        describe('ESM interop', () => {
            it('should not get confused by default property in a JS file', async () => {
                const fileName = configPathFixture('with-default.js')

                await expect(importDefault(fileName)).resolves.toEqual({
                    default: {
                        'i am': 'default',
                    },
                })
            })

            it('should not get confused by default property in a JSON file', async () => {
                const fileName = configPathFixture('with-default.json')

                await expect(importDefault(fileName)).resolves.toEqual({
                    default: {
                        'i am': 'default',
                    },
                })
            })
        })
    })
})
