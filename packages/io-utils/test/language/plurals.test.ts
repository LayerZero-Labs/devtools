import { pluralizeNoun, pluralizeOrdinal } from '@/language'

describe('language/plurals', () => {
    describe('pluralizeOrdinal', () => {
        it.each([0, 1, 2, 3, 4, 5, 11, 12, 21, 100, 1234])(`should work for %d`, (n) =>
            expect(pluralizeOrdinal(n)).toMatchSnapshot()
        )
    })

    describe('pluralizeNoun', () => {
        describe('without custom plural', () => {
            it.each([0, 1, 2, 3, 4, 5, 11, 12, 21, 100, 1234])(`should work for %d`, (n) =>
                expect(pluralizeNoun(n, 'cat')).toMatchSnapshot()
            )
        })

        describe('with custom plural', () => {
            it.each([0, 1, 2, 3, 4, 5, 11, 12, 21, 100, 1234])(`should work for %d`, (n) =>
                expect(pluralizeNoun(n, 'cactus', 'cacti')).toMatchSnapshot()
            )
        })
    })
})
