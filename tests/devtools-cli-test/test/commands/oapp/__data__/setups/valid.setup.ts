import {
    createConnectedContractFactory,
    createSignerFactory,
    createDefaultContext,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'

import type { CLISetup } from '@layerzerolabs/devtools-cli'

/**
 * Since we are not in hardhat CLI, we'll need to create the context first
 */
createDefaultContext()

/**
 * This is a setup file for @layerzerolabs/devtools-cli.
 *
 * At the moment, @layerzerolabs/devtools-cli is in development
 * and will be available
 */
const setup: CLISetup = {
    createSdk: createOAppFactory(createConnectedContractFactory()),
    createSigner: createSignerFactory(),
}

export default setup
