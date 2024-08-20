import { task } from 'hardhat/config'
import config from './hardhat.config'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import type { SubtaskConfigureTaskArgs, SubtaskLoadConfigTaskArgs } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { SUBTASK_LZ_OAPP_CONFIG_LOAD, SUBTASK_LZ_OAPP_WIRE_CONFIGURE } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { createProviderFactory } from '@layerzerolabs/devtools-evm-hardhat'
import {
    MyCustomOAppSDK,
    MyCustomOmniGraph,
    MyCustomOmniGraphHardhatSchema,
    myCustomOAppConfigurator,
} from './layerzero.config.with-custom-configuration'
import type { OmniPoint } from '@layerzerolabs/devtools'

const SUBTASK_CUSTOM_CONFIG_LOADING = '::my:custom:config:loading:subtask'
const SUBTASK_CUSTOM_CONFIGURE = '::my:custom:configure:subtask'

/**
 * Here we define a custom config loading & validation task
 *
 * Instead of using the default schema, we'll pass our own schema
 * that also validates the `customProperty` value.
 *
 * This step is optional - the default schema will pass any additonal
 * properties through (so the customProperty will be included).
 */
task(
    SUBTASK_CUSTOM_CONFIG_LOADING,
    'Custom configuration loading subtask',
    async (args: SubtaskLoadConfigTaskArgs, hre) => {
        const logger = createModuleLogger(SUBTASK_CUSTOM_CONFIG_LOADING)

        logger.info('Using custom config loading task')

        return hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
            ...args,
            schema: MyCustomOmniGraphHardhatSchema,
        } satisfies SubtaskLoadConfigTaskArgs)
    }
)

/**
 * Here we define a custom configuration task
 *
 * Instead of using the default configurator (`configureOApp`),
 * we'll pass our own (`myCustomOAppConfigurator`).
 *
 * We'll also pass our own SDK factory. This is optional
 * and users might opt to skip the SDK layer altogether and access raw contract
 * data instead.
 *
 * This step is required - the default schema will pass any additonal
 * properties through (so the customProperty will be included).
 */
task(
    SUBTASK_CUSTOM_CONFIGURE,
    'Custom configuration subtask',
    async (args: SubtaskConfigureTaskArgs<MyCustomOmniGraph>, hre) => {
        const logger = createModuleLogger(SUBTASK_CUSTOM_CONFIGURE)

        logger.info('Using custom configure task')

        // Here we create the SDK factory
        const { abi } = await import('./artifacts/contracts/CustomOApp.sol/CustomOApp.json')
        const providerFactory = createProviderFactory()
        const sdkFactory = async (point: OmniPoint) => new MyCustomOAppSDK(await providerFactory(point.eid), point, abi)

        return hre.run(SUBTASK_LZ_OAPP_WIRE_CONFIGURE, {
            ...args,
            sdkFactory,
            configurator: myCustomOAppConfigurator,
        } satisfies SubtaskConfigureTaskArgs<MyCustomOmniGraph, MyCustomOAppSDK>)
    }
)

export default config
