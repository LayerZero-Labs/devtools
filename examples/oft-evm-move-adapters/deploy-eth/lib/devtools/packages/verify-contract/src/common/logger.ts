import chalk from 'chalk'
import { type Logger } from '@layerzerolabs/io-devtools'

export const COLORS = {
    default: chalk.white,
    error: chalk.red,
    success: chalk.green,
    palette: [
        chalk.magenta,
        chalk.cyan,
        chalk.yellow,
        chalk.blue,
        chalk.magentaBright,
        chalk.cyanBright,
        chalk.blueBright,
    ],
}

/**
 * Helper utility for anonymizing values printed out to the user,
 * this is useful for displaying partial API keys
 *
 * @param value
 * @returns
 */
export const anonymizeValue = (value: string): string => {
    const visibleLength = Math.min(Math.max(0, value.length - 2), 4)
    const invisibleLength = value.length - visibleLength

    const visiblePart = value.slice(0, visibleLength)
    const invisiblePart = Array.from({ length: invisibleLength }).fill('*').join('')

    return `${visiblePart}${invisiblePart}`
}

type LoggableValue = string | number | boolean | bigint | null | undefined
type LoggableRecord = Record<string, LoggableValue | LoggableValue[]>

export type RecordLogger = (record: LoggableRecord) => void

export const createRecordLogger =
    (logger: Logger, separator = '\t'): RecordLogger =>
    (record: LoggableRecord): void => {
        logger.info('')

        Object.entries(record).forEach(([label, value]) => {
            if (Array.isArray(value)) {
                logger.info(`${label}:`)

                value.forEach((item) => {
                    logger.info(`${separator}\t- ${chalk.bold(formatLoggableValue(item))}`)
                })
            } else {
                logger.info(`${label}:${separator}${chalk.bold(formatLoggableValue(value))}`)
            }
        })
    }

const formatLoggableValue = (value: LoggableValue): string => {
    if (value == null) {
        return '-'
    }

    switch (typeof value) {
        case 'boolean':
            return value ? TRUE_SYMBOL : FALSE_SYMBOL

        default:
            return String(value)
    }
}

const TRUE_SYMBOL = COLORS.success`✓`
const FALSE_SYMBOL = COLORS.error`⚠`
