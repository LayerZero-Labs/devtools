import chalk from 'chalk'

export const COLORS = {
    default: chalk.white,
    error: chalk.red,
    warning: chalk.yellow,
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

export const SUCCESS_SYMBOL = COLORS.success`✓`
export const ERROR_SYMBOL = COLORS.error`⚠`
