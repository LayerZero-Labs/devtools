import * as fs from 'fs'
import * as path from 'path'

import { Idl } from '@coral-xyz/anchor'
import { AnchorIdl, rootNodeFromAnchor } from '@kinobi-so/nodes-from-anchor'
import { renderVisitor } from '@kinobi-so/renderers-js-umi'
import { createFromRoot } from 'kinobi'

async function generateTypeScriptSDK(): Promise<void> {
    const generatedSDKDir = path.join(__dirname, '..', 'client', 'generated', 'my_oapp')
    const anchorIdlPath = path.join(__dirname, '..', '..', 'target', 'idl', 'my_oapp.json')
    const anchorIdl = JSON.parse(fs.readFileSync(anchorIdlPath, 'utf8')) as Idl
    anchorIdl.address = '' // Clear out address to avoid confusion, as the `address` in the IDL would be something like "anchorlangsolanaprogrampubkeyPubkeynewfromarrayprogramidfromenvMYOAPPIDn41NCdrEvXhQ4mZgyJkmqYxL6A1uEmnraGj31UJ6PsXd3" due to how the IDL generation build step not being able to process environment variables.
    // This is also acceptable as the client SDK requires the program ID to be provided at runtime.
    console.error('Generating TypeScript SDK to %s. IDL from %s', generatedSDKDir, anchorIdlPath)
    const kinobi = createFromRoot(rootNodeFromAnchor(anchorIdl as AnchorIdl))
    void kinobi.accept(renderVisitor(generatedSDKDir))
}

;(async (): Promise<void> => {
    await generateTypeScriptSDK()
})().catch((err: unknown) => {
    console.error(err)
    process.exit(1)
})
