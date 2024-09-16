import type { HardhatRuntimeEnvironment, HardhatArguments } from 'hardhat/types'

import { HardhatContext } from 'hardhat/internal/context'
import { Environment as HardhatRuntimeEnvironmentImplementation } from 'hardhat/internal/core/runtime-environment'
import { loadConfigAndTasks } from 'hardhat/internal/core/config/config-loading'

/**
 * Creates a test HardhatRuntimeEnvironment with specific arguments
 *
 * ```typescript
 * const env = getTestHre({ networkName: "bsc-testnet", config: "./hardhat.config.other.ts" });
 * ```
 *
 * @returns {HardhatRuntimeEnvironment}
 */
export const getTestHre = (args: Partial<HardhatArguments>): HardhatRuntimeEnvironment => {
    const context = HardhatContext.getHardhatContext()
    const environment = context.getHardhatRuntimeEnvironment()

    const hardhatArguments: HardhatArguments = { ...environment.hardhatArguments, ...args }
    const { resolvedConfig, userConfig } = loadConfigAndTasks(hardhatArguments)

    return new HardhatRuntimeEnvironmentImplementation(
        resolvedConfig,
        hardhatArguments,
        environment.tasks,
        environment.scopes,
        context.environmentExtenders,
        userConfig,
        context.providerExtenders
        // This is a bit annoying - the environmentExtenders are not stronly typed
        // so TypeScript complains that the properties required by HardhatRuntimeEnvironment
        // are not present on HardhatRuntimeEnvironmentImplementation
    ) as unknown as HardhatRuntimeEnvironment
}
