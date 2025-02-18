import { lstatSync } from 'fs'

export const isDirectory = (pathlike: string): boolean => {
    try {
        return lstatSync(pathlike).isDirectory()
    } catch {
        return false
    }
}

export const isFile = (pathlike: string): boolean => {
    try {
        return lstatSync(pathlike).isFile()
    } catch {
        return false
    }
}
