import { lstatSync } from 'fs'

export const isDirectory = (path: string) => {
    try {
        return lstatSync(path).isDirectory()
    } catch {
        return false
    }
}
