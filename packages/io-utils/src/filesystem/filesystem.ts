import { accessSync, constants, lstatSync } from 'fs'

export const isDirectory = (path: string): boolean => {
    try {
        return lstatSync(path).isDirectory()
    } catch {
        return false
    }
}

export const isFile = (path: string): boolean => {
    try {
        return lstatSync(path).isFile()
    } catch {
        return false
    }
}

export const isReadable = (path: string): boolean => {
    try {
        return accessSync(path, constants.R_OK), true
    } catch {
        return false
    }
}
