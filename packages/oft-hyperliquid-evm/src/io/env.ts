import path from 'path'

import dotenv from 'dotenv'

export function loadEnv() {
    const envPath = path.resolve(path.join(process.cwd(), '.env'))
    // eslint-disable-next-line import/no-named-as-default-member
    const env = dotenv.config({ path: envPath })
    if (!env.parsed || env.error?.message !== undefined) {
        console.error('Failed to load .env file.')
        process.exit(1)
    }

    return env.parsed
}
