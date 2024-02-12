import { anonymizeValue } from '@/common/logger'

describe('logger', () => {
    describe('anonymizeValue', () => {
        it.each([
            ['', ''],
            ['a**', 'abc'],
            ['ab**', 'abcd'],
            ['abc**', 'abcde'],
            ['abcd**', 'abcdef'],
            ['abcd***', 'abcdefg'],
            ['abcd****', 'abcdefgh'],
        ])('should return "%s" when passed "%s"', (output, input) => {
            expect(anonymizeValue(input)).toBe(output)
        })
    })
})
