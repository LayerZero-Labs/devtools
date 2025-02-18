const cardinalRules = new Intl.PluralRules('en-US')

const ordinalRules = new Intl.PluralRules('en-US', { type: 'ordinal' })
const ordinals: Record<Intl.LDMLPluralRule, string> = {
    one: 'st',
    two: 'nd',
    few: 'rd',
    other: 'th',
    zero: 'th',
    many: 'th',
}

/**
 * Turn a number into an ordinal.
 *
 * ```typescript
 * pluralizeOrdinal(7) // 7th
 * pluralizeOrdinal(1) // 1st
 * pluralizeOrdinal(19) // 19th
 * ```
 *
 * @param {number} n
 * @returns {string}
 */
export const pluralizeOrdinal = (n: number): string => {
    const rule = ordinalRules.select(n)
    const suffix = ordinals[rule]

    return `${n}${suffix}`
}

/**
 * Choose a correct form of a noun based on cardinality.
 *
 * ```typescript
 * pluralizeNoun(7, 'cat') // cats
 * pluralizeNoun(1, 'cat') // cat
 * pluralizeNoun(19, 'cactus', 'cacti') // cacti
 * ```
 *
 * @param {number} n
 * @param {string} singular The singular form of the english noun
 * @param {string} [plural] Plural version of the noun for irregular cases
 * @returns {string}
 */
export const pluralizeNoun = (n: number, singular: string, plural: string = `${singular}s`): string => {
    const rule = cardinalRules.select(n)
    if (rule === 'one') {
        return singular
    }

    return plural
}
