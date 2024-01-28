import Table, { HorizontalTableRow } from 'cli-table3'
import type { ZodError } from 'zod'

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
 * @returns
 */
const printValue = (value: unknown): string => {
    switch (true) {
        case value == null:
        case value instanceof Date:
        case typeof value !== 'object':
            return String(value)

        default:
            return printRecord(value)
    }
}

export const printRecord = <TRecord extends object>(obj: TRecord, title?: string | number): string => {
    const table = new Table({
        wordWrap: true,
        wrapOnWordBoundary: false,
    })

    const headers: HorizontalTableRow[] = title == null ? [] : [[{ content: title, colSpan: 2 }]]
    const rows = Object.entries(obj).map(([key, value]): HorizontalTableRow => [key, printValue(value)])

    return table.push(...headers, ...rows), table.toString()
}

/**
 * Renders a cross table with rows labeled by object properties
 * and columns labeled by an optional header.
 *
 * If passed, the header should also account for the first column containing
 * the property name.
 *
 * @param {Record<string | number, unknown>} records
 * @param {string[]} [header]
 * @returns {string}
 */
export const printCrossTable = <TRecord extends Record<string | number, unknown>>(
    records: TRecord[],
    header?: string[]
): string => {
    const table = new Table({
        head: header ?? [],
        wordWrap: true,
        wrapOnWordBoundary: false,
        style: { head: ['reset'] },
    })

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
        if (!propertiesLeft.has(property)) continue

        // Now we mark the property as added
        propertiesLeft.delete(property)

        // Get all the values and print them
        const values = records.map((record) => record[property]).map(printValue)

        // Create a row with the property label first
        const row = [property, ...values]

        // And add to the table
        table.push(row)
    }

    return table.toString()
}

/**
 * Helper utility for printing out boolean values
 *
 * @param {boolean | null | undefined} value
 * @returns {string}
 */
export const printBoolean = (value: boolean | null | undefined): string => (value == null ? '∅' : value ? '✓' : '⤫')

export const printZodErrors = (error: ZodError<unknown>): string => {
    // Here we will go through all the errors and prefix them with the name
    // of the property on which they happened, if any
    const errors = error.flatten((issue) => {
        const propertyPath = issue.path?.join('.') ?? ''
        if (propertyPath === '') return issue.message

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
