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
 * pluralizeNoun(1) // 1st
 * pluralizeNoun(19, 'cacti') // 19th
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
 * pluralizeNoun('cat', 7) // cats
 * pluralizeNoun('cat', 1) // cat
 * pluralizeNoun('cactus', 19, 'cacti') // cacti
 * ```
 *
 * @param {string} singular The signular form of the english noun
 * @param {number} n
 * @param {string} [plural] Plural version of the noun for irregular cases
 * @returns {string}
 */
export const pluralizeNoun = (singular: string, n: number, plural: string = `${singular}s`): string => {
    const rule = cardinalRules.select(n)
    if (rule === 'one') return singular

    return plural
}
