import path from 'path'

import { BuildOptions, MoveBuilder } from '@initia/builder.js'

async function buildMoveModule() {
    const modulePath = path.resolve(__dirname)

    const config = {
        additionalNamedAddresses: [
            // ['oft', '0x2E2DE55E5162D58C41DE389CCF6D7CA8DE3940A6'],
            // ['oft_admin', '0x2E2DE55E5162D58C41DE389CCF6D7CA8DE3940A6'],
        ],
    }

    try {
        const builder = new MoveBuilder(modulePath, config as BuildOptions)
        await builder.build()
        console.log('Build completed successfully')
    } catch (error) {
        console.error('Build failed:', error)
        throw error
    }
}

// Run the build
buildMoveModule().catch(console.error)
