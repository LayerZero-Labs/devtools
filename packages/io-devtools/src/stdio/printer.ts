import { ColumnUserConfig, getBorderCharacters, table } from 'table'
import chalk from 'chalk'
import type { ZodError } from 'zod'

type Preprocess = (value: string) => string
export const COLORS = {
    TRUE: chalk.rgb(0, 153, 0), // GREEN
    FALSE: chalk.rgb(255, 0, 0), // RED
    NOT_APPLICABLE: chalk.rgb(255, 128, 0), // ORANGE
    DEFAULT_KEY: chalk.rgb(255, 255, 255), // WHITE
    DEFAULT_VALUE: chalk.rgb(167, 125, 255), // MAGENTA
}

/**
 * Returns a JSON-serialized version of a string, replacing all `BigInt`
 * instances with strings
 *
 * ```
 * const json = printJson({ a: BigInt(1) }) // { "a": "1" }
 * ```
 *
 * @param {unknown} obj Object to serialize
 * @param {boolean} [pretty] Return a pretty, tab-delimited JSON string. Defaults to true.
 * @returns {string}
 */
export const printJson = (obj: unknown, pretty = true): string =>
    JSON.stringify(
        obj,
        (key, value) => (typeof value === 'bigint' ? value.toString(10) : value),
        pretty ? '\t' : undefined
    )

/**
 * Helper function for the other printers.
 *
 * Will check for the value type and either print a string representation
 * of the value or use `printRecord` if possible.
 *
 * @see {@link printRecord}
 *
 * @param value
 * @param keyColor - color of keys in table (DEFAULT: WHITE)
 * @param valueColor - color of values in table (DEFAULT: MAGENTA)
 * @returns
 */
const printValue = (
    value: unknown,
    keyColor: Preprocess = COLORS.DEFAULT_KEY,
    valueColor: Preprocess = COLORS.DEFAULT_VALUE
): string => {
    switch (true) {
        case value == null:
        case value instanceof Date:
        case typeof value !== 'object':
            return valueColor(String(value))

        default:
            return printRecord(value, undefined, keyColor, valueColor)
    }
}

export const printRecord = <TRecord extends object>(
    obj: TRecord,
    title?: string | number,
    keyColor: Preprocess = COLORS.DEFAULT_KEY,
    valueColor: Preprocess = COLORS.DEFAULT_VALUE
): string => {
    const rows = Object.entries(obj).map(([key, value]): string[] => [
        keyColor(key),
        printValue(value, keyColor, valueColor),
    ])

    if (title != null) {
        rows.unshift([keyColor(String(title)), ''])
    }

    // The table library throws if there are no rows so we need to take care of that possibility
    if (rows.length === 0) {
        return ''
    }

    return table(rows, {
        border: getBorderCharacters('norc'),
        spanningCells: title == null ? undefined : [{ col: 0, row: 0, colSpan: 2 }],
    })
}

/**
 * Renders a cross table with rows labeled by object properties
 * and columns labeled by an optional header.
 *
 * If passed, the header should also account for the first column containing
 * the property name.
 *
 * @param {Record<string | number, unknown>} records
 * @param {string[]} [headers] - header row if provided
 * @param {boolean} [center] - center text if true
 * @param {Preprocess} [keyColor=COLORS.DEFAULT_KEY] keyColor - color of keys in table
 * @param {Preprocess} [valueColor=COLORS.DEFAULT_VALUE] valueColor - color of values in table
 * @returns {string}
 */
export const printCrossTable = <TRecord extends Record<string | number, unknown>>(
    records: TRecord[],
    headers?: string[],
    center?: boolean,
    keyColor: Preprocess = COLORS.DEFAULT_KEY,
    valueColor: Preprocess = COLORS.DEFAULT_VALUE
): string => {
    const columns: ColumnUserConfig[] = center
        ? (['left', ...records.map(() => 'center')].map((alignment) => ({ alignment })) as ColumnUserConfig[])
        : []
    // Set the colored headers if provided
    const headerRow: string[] = headers?.map((header) => keyColor(header)) ?? []
    const rows: string[][] = [headerRow]

    // We'll gather all the properties of all the records in this array
    //
    // We do this in case some of the objects were missing any properties -
    // we take all the properties of all the objects, then mark the ones we already added
    // to our table in the set below. That way, if there is a property present on one object only,
    // it will still be added to the table
    const properties = records.flatMap(Object.keys)
    const propertiesLeft: Set<string> = new Set(properties)

    for (const property of properties) {
        // If we already added this one, we continue
        if (!propertiesLeft.has(property)) {
            continue
        }

        // Now we mark the property as added
        propertiesLeft.delete(property)

        // Get all the values and print them
        const values = records.map((record) => printValue(record[property], keyColor, valueColor))

        // Create a row with the property label first
        const row = [keyColor(property), ...values]

        // And add to the table
        rows.push(row)
    }

    return table(rows, { border: getBorderCharacters('norc'), columns })
}

/**
 * Helper utility for printing out boolean values
 *
 * @param {boolean | null | undefined} value
 * @param {Preprocess} [nullColor=COLORS.NOT_APPLICABLE] nullColor
 * @param {Preprocess} [trueColor=COLORS.TRUE] trueColor
 * @param {Preprocess} [falseColor=COLORS.FALSE] falseColor
 * @returns {string}
 */
export const printBoolean = (
    value: boolean | null | undefined,
    nullColor: Preprocess = COLORS.NOT_APPLICABLE,
    trueColor: Preprocess = COLORS.TRUE,
    falseColor: Preprocess = COLORS.FALSE
): string => (value == null ? nullColor('∅') : value ? trueColor('✓') : falseColor('⤫'))

export const printZodErrors = (error: ZodError<unknown>): string => {
    // Here we will go through all the errors and prefix them with the name
    // of the property on which they happened, if any
    const errors = error.flatten((issue) => {
        const propertyPath = issue.path?.join('.') ?? ''
        if (propertyPath === '') {
            return issue.message
        }

        return `Property '${propertyPath}': ${issue.message}`
    })

    // These are the errors coming from a mismatch on the root object - e.g. when a whole object is completely missing
    const formErrors = errors.formErrors

    // These are errors coming from object properties
    const fieldErrors = Object.values<unknown[]>(errors.fieldErrors).flat()

    // Now we take all the errors we got
    const allErrors = [...formErrors, ...fieldErrors]

    // And concatenate
    return allErrors.join(`\n`)
}
