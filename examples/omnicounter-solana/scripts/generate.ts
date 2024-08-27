import { writeFile } from 'fs/promises'
import * as path from 'path'

import { Solita } from '@metaplex-foundation/solita'

async function generateTypeScriptSDK() {
    const generatedIdlDir = path.join(__dirname, '..', 'idl')
    const address = '2tLJfE12h5RY7vJqK6i41taeg8ejzigoFXduBanDV4Cu'
    const generatedSDKDir = path.join(__dirname, '..', 'src', 'generated', 'omnicounter')
    const idl = require('../idl/omnicounter.json')
    if (idl.metadata?.address == null) {
        idl.metadata = { ...idl.metadata, address }
        await writeFile(generatedIdlDir + '/omnicounter.json', JSON.stringify(idl, null, 2))
    }
    const gen = new Solita(idl, { formatCode: true })
    await gen.renderAndWriteTo(generatedSDKDir)
}

;(async () => {
    await generateTypeScriptSDK()
})()
