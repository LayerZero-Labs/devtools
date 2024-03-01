const ENTER_ALT_SCREEN_ANSI = '\x1b[?1049h'
const EXIT_ALT_SCREEN_ANSI = '\x1b[?1049l'

/**
 * Helper function that wraps socket writes with a promise
 *
 * @param socket `WriteStream`
 * @returns `(content: string) => Promise<void>`
 */
const createWrite = (socket: NodeJS.WriteStream) => (content: string) => {
    return new Promise<void>((resolve, reject) => {
        socket.write(content, (error) => {
            if (error != null) {
                reject(error)
            } else {
                resolve()
            }
        })
    })
}

/**
 * Starts an alt screen and returns a callback that exits back to the default screen.
 * This makes the app "full screen"
 *
 * See https://github.com/vadimdemedes/ink/issues/263 for more info
 *
 * @returns `Promise<() => void>`
 */
export const altScreen = async () => {
    const write = createWrite(process.stdout)

    await write(ENTER_ALT_SCREEN_ANSI)

    return () => write(EXIT_ALT_SCREEN_ANSI)
}
