import Table, { HorizontalTableRow } from 'cli-table3'
import type { ZodError } from 'zod'

export const printJson = (obj: unknown, pretty = true): string =>
    JSON.stringify(
        obj,
        (key, value) => (typeof value === 'bigint' ? value.toString(10) : value),
        pretty ? '\t' : undefined
    )

export const printRecord = <TRecord extends object>(obj: TRecord, title?: string | number): string => {
    const table = new Table({
        wordWrap: true,
        wrapOnWordBoundary: false,
    })

    const headers: HorizontalTableRow[] = title == null ? [] : [[{ content: title, colSpan: 2 }]]
    const rows = Object.entries(obj).map(([key, value]): HorizontalTableRow => {
        switch (true) {
            case value == null:
            case value instanceof Date:
            case typeof value !== 'object':
                return [key, String(value)]

            default:
                return [key, printRecord(value)]
        }
    })

    return table.push(...headers, ...rows), table.toString()
}

/**
 * Helper utility for printing out boolean values
 *
 * @param {boolean | null | undefined} value
 * @returns {string}
 */
export const printBoolean = (value: boolean | null | undefined): string => (value == null ? '∅' : value ? '✅' : '❌')

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
