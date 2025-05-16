import * as path from 'path'

import { IdlV00, rootNodeFromAnchor } from '@kinobi-so/nodes-from-anchor'
import { renderVisitor } from '@kinobi-so/renderers-js-umi'
import { createFromRoot } from 'kinobi'

import { exchangeIDLJson, moveGenEventFiles } from './exchange'

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function generateTypeScriptSDK(): Promise<void> {
    const generatedSDKDir = path.join(__dirname, '..', 'client', 'generated', 'my_oapp')
    const anchorIdlPath = path.join(__dirname, '..', '..', 'target', 'idl', 'my_oapp.json')
    const anchorIdl = exchangeIDLJson(anchorIdlPath)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    anchorIdl.metadata = { ...anchorIdl.metadata, address: 'HFyiETGKEUS9tr87K1HXmVJHkqQRtw8wShRNTMkKKxay' }
    console.error('Generating TypeScript SDK to %s. IDL from %s', generatedSDKDir, anchorIdlPath)
    const kinobi = createFromRoot(rootNodeFromAnchor(anchorIdl as IdlV00))
    void kinobi.accept(renderVisitor(generatedSDKDir))
    await sleep(1000)
    await moveGenEventFiles(generatedSDKDir, anchorIdl.events ?? [])
}

;(async (): Promise<void> => {
    await generateTypeScriptSDK()
})().catch((err: unknown) => {
    console.error(err)
    process.exit(1)
})
