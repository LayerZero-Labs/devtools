/**
 * Splits a comma-separated string into individual values
 * and discards any whitespace.
 *
 * @param {string} value
 * @returns {string[]}
 */
export const splitCommaSeparated = (value: string): string[] =>
    value
        .trim()
        .split(/\s*,\s*/)
        .filter(Boolean)
