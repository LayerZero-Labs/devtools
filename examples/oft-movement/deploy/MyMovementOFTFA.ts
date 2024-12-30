import { build, deploy, executeSetDelegate } from '@layerzerolabs/devtools-movement'

import { initOFTFA } from '@layerzerolabs/oft-movement'

const contractName = 'oft'

async function DeployOFTFA(args: any) {
    await build(args, contractName)
    await deploy(args, contractName)

    await executeSetDelegate()

    const token_name = 'MyMovementOFT'
    const token_symbol = 'MMOFT'
    const icon_uri = ''
    const project_uri = ''

    await initOFTFA(token_name, token_symbol, icon_uri, project_uri)
}

export { DeployOFTFA }
