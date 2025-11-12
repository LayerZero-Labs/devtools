import fs from 'fs'
import path from 'path'
import readline from 'readline'

import { IdlEvent } from '@coral-xyz/anchor/dist/cjs/idl'
import { camelCase } from 'kinobi'

/**
 * move generated event files to events folder
 * @param generatedSDKDir generated sdk directory
 */
export async function moveGenEventFiles(generatedSDKDir: string, events: IdlEvent[]): Promise<void> {
    const generatedTypesDir = path.join(generatedSDKDir, 'types')
    const generatedEventsDir = path.join(generatedSDKDir, 'events')
    //special event names which are not end with Event
    // const specialEventNames = ['OFTSent', 'OFTReceived']
    const index = 'index.ts'

    // if types folder not exist, return directly
    if (!fs.existsSync(generatedTypesDir)) {
        return
    }

    //get all event file names
    const eventFileNames = events.map((event) => {
        const { name } = event
        return `${camelCase(name)}.ts`
    })
    if (eventFileNames.length > 0) {
        if (!fs.existsSync(generatedEventsDir)) {
            fs.mkdirSync(generatedEventsDir)
        }
        eventFileNames.forEach((fileName) => {
            const originalPath = path.join(generatedTypesDir, fileName)
            const newPath = path.join(generatedEventsDir, fileName)
            // move event file from types to events, if it exists
            if (fs.existsSync(originalPath)) {
                fs.renameSync(originalPath, newPath)
                fixEventFiles(newPath)
            }
        })

        //move invalid lines from types/index.ts to events/index.ts
        const needMoveLines: string[] = []
        const typesIndexFileReadStream = fs.createReadStream(path.join(generatedTypesDir, index))
        const typesInvalidLines = readline.createInterface({ input: typesIndexFileReadStream, crlfDelay: Infinity })
        const newTypeIndexFileLines = []
        for await (const line of typesInvalidLines) {
            let invalid = false
            events.forEach((event) => {
                if (line.endsWith(`${camelCase(event.name)}';`)) {
                    needMoveLines.push(line)
                    invalid = true
                }
            })
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!invalid) {
                newTypeIndexFileLines.push(line)
            }
        }
        // first: remove invalid lines from types/index.ts.
        fs.writeFileSync(path.join(generatedTypesDir, index), newTypeIndexFileLines.join('\n'), 'utf8')
        typesIndexFileReadStream.close()

        // second: add invalid lines to events/index.ts.
        fs.writeFileSync(path.join(generatedEventsDir, index), needMoveLines.join('\n'), 'utf8')
    }
}

/**
 * some event file need to import types from types folder, but they are not in the same folder now, so fix it
 * @param path
 */
function fixEventFiles(path: string): void {
    let content = fs.readFileSync(path, 'utf8')
    if (content.includes("from '.'")) {
        content = content.replace("from '.'", "from '../types'")
        fs.writeFileSync(path, content, 'utf8')
    }
}
