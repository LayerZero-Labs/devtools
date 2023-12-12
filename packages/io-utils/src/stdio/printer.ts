import Table, { HorizontalTableRow } from 'cli-table3'

export const printJson = (obj: unknown, pretty = true): string => JSON.stringify(obj, null, pretty ? '\t' : undefined)

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
