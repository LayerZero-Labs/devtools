import { AnvilOptions, createAnvilCliOptions } from '@/simulation/anvil'

describe('simulation/anvil', () => {
    describe('createAnvilCliOptions()', () => {
        it('should return an empty array for empty options', () => {
            expect(createAnvilCliOptions({})).toStrictEqual([])
        })

        it('should return an empty array for undefined options', () => {
            // In order to keep this test in sync with the source code, we'll create a type
            // that will require all the properties of AnvilOptions but will make them undefined
            const anvilOptionsWithEverythingUndefined: Record<keyof AnvilOptions, undefined> = {
                host: undefined,
                port: undefined,
                mnemonic: undefined,
                forkUrl: undefined,
                forkBlockNumber: undefined,
                retries: undefined,
                timeout: undefined,
                blockTime: undefined,
                count: undefined,
                derivationPath: undefined,
                state: undefined,
                stateInterval: undefined,
                pruneHistory: undefined,
            }

            expect(createAnvilCliOptions(anvilOptionsWithEverythingUndefined)).toStrictEqual([])
        })

        const TEST_CASES: AnvilOptions[] = [
            {
                host: '0.0.0.0',
            },
            {
                port: 7777,
            },
            {
                host: 'localhost',
                port: 7777,
            },
            {
                mnemonic: 'oh boi oh boi oh boi oh boi oh boi oh boi',
            },
            {
                mnemonic: 'oh boi oh boi oh boi oh boi oh boi oh boi',
                count: 6,
            },
            {
                forkUrl: 'http://hotmail.com/mainnet',
                blockTime: 1,
            },
            {
                forkUrl: 'http://hotmail.com/mainnet',
                pruneHistory: false,
            },
            {
                pruneHistory: true,
            },
        ]

        TEST_CASES.forEach((testCase) => {
            it(`it should work for ${JSON.stringify(testCase)}`, () => {
                expect(createAnvilCliOptions(testCase)).toMatchSnapshot()
            })
        })
    })
})
