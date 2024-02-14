import { deduplicateRecord } from './utils'

describe('generator/typescript/utils', () => {
    describe('deduplicateRecord', () => {
        it.each([
            [[[], {}], {}],
            [[[false], { ole: 0 }], { ole: false }],
            [[[true, false], { ola: 0, ole: 1 }], { ola: true, ole: false }],
            [[[{}], { ola: 0, ole: 0 }], { ola: {}, ole: {} }],
            [[[{}, { value: 1 }], { ola: 0, ole: 1 }], { ola: {}, ole: { value: 1 } }],
            [[[[{}]], { ola: 0, ole: 0 }], { ola: [{}], ole: [{}] }],
            [[[[{ a: 0 }], [{ a: 1 }]], { ola: 0, ole: 1 }], { ola: [{ a: 0 }], ole: [{ a: 1 }] }],
        ])(`should return %j for %j`, (result, record) => {
            expect(deduplicateRecord(record)).toEqual(result)
        })
    })
})
