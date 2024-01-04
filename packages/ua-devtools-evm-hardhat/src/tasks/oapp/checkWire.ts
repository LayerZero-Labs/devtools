import { ActionType } from 'hardhat/types'
import { task, types } from 'hardhat/config'
import { createLogger, setDefaultLogLevel} from '@layerzerolabs/io-devtools'
import { TASK_LZ_CHECK_WIRE_OAPP } from '@/constants/tasks'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { checkOAppPeers } from '@layerzerolabs/ua-devtools'
import {endpointIdToNetwork} from "@layerzerolabs/lz-definitions";
import {validateAndTransformOappConfig} from "@/utils/taskHelpers";

interface TaskArgs {
    oappConfig: string
    logLevel?: string
}

export const checkWire: ActionType<TaskArgs> = async ({ oappConfig: oappConfigPath, logLevel = 'info' }) => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()
    let graph: OAppOmniGraph = await validateAndTransformOappConfig(oappConfigPath, logger)

    // At this point we are ready to create the list of transactions
    const contractFactory = createConnectedContractFactory()
    const oAppFactory = createOAppFactory(contractFactory)

    const checkWireAllConfigObj = await checkOAppPeers(graph, oAppFactory)
    let updatedCheckWireAllConfigObj = updateKeys(checkWireAllConfigObj);
    
    console.table(updatedCheckWireAllConfigObj)
    return checkWireAllConfigObj
}

task(
    TASK_LZ_CHECK_WIRE_OAPP,
    'outputs visual console table to show current state of oapp connections via configuration'
)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', './layerzero.config.js', types.string)
    .setAction(checkWire)


export function updateKeys(obj: { [key: string]: any }): { [key: string]: any } {
    return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        if (typeof value === 'object' && value !== null && value.hasOwnProperty("peer")) {
            acc[endpointIdToNetwork(parseInt(key))] = {peer: updateKeys(value.peer)}
        } else {
            acc[endpointIdToNetwork(parseInt(key))] = value;
        }
        return acc;
    }, {});
}