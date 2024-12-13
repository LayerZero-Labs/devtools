import { Contract } from 'ethers'

import { ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities-v3'

import { diffPrinter } from '../../shared/utils'

import type { ContractMetadataMapping, EidTxMap, NonEvmOAppMetadata, enforcedOptionParam } from '../utils/types'

/**
 * @notice Sets EnforcedOptions for a contract.
 * @dev Fetches the current enforcedOptions from Oapp
 * @dev Sets the new enforcedOptions on the Oapp
 * @returns EidTxMap
 */
export async function createSetEnforcedOptionsTransactions(
    eidDataMapping: ContractMetadataMapping,
    _nonEvmOapp: NonEvmOAppMetadata
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        if (!configOapp?.enforcedOptions) {
            console.log(`\x1b[43m Skipping: No enforced options have been set for ${eid} @ ${address.oapp} \x1b[0m`)
            continue
        }
        const toEnforcedOptions = configOapp.enforcedOptions
        const thisEnforcedOptionBuilder: Record<number, Options> = {}

        // Iterate over toEnforcedOptions and reduce by msgType
        for (const currEnforcedOption of toEnforcedOptions) {
            if (!thisEnforcedOptionBuilder[currEnforcedOption.msgType]) {
                thisEnforcedOptionBuilder[currEnforcedOption.msgType] = Options.newOptions()
            }

            thisEnforcedOptionBuilder[currEnforcedOption.msgType] = reduceOptionsByMsgType(
                thisEnforcedOptionBuilder[currEnforcedOption.msgType],
                currEnforcedOption
            )
        }

        // Extract the msgTypes
        const msgTypes = Object.keys(thisEnforcedOptionBuilder).map((msgType) => Number(msgType))

        // Populate the arguments for the transaction function call
        const enforcedOptionParams: enforcedOptionParam[] = []

        const diffcurrOptions: Record<number, string> = {}
        const diffnewOptions: Record<number, string> = {}

        for (const msgType of msgTypes) {
            const currOptions = await getEnforcedOption(contract.oapp, eid, msgType)
            const newOptions = thisEnforcedOptionBuilder[msgType].toHex()

            if (currOptions === newOptions) {
                console.log(
                    `\x1b[43m Skipping: The same enforced options have been set for ${eid} @ ${address.oapp} \x1b[0m`
                )
            } else {
                diffcurrOptions[msgType] = currOptions
                diffnewOptions[msgType] = newOptions

                enforcedOptionParams.push({
                    eid: eid,
                    msgType: msgType,
                    options: newOptions,
                })

                diffPrinter(`Setting Enforced Options on ${eid}`, diffcurrOptions, diffnewOptions)

                const tx = await contract.oapp.populateTransaction.setEnforcedOptions(enforcedOptionParams)

                txTypePool[eid] = txTypePool[eid] ?? []
                txTypePool[eid].push(tx)
            }
        }
    }

    return txTypePool
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reduceOptionsByMsgType(baseOptions: Options, addOption: any): Options {
    const optionType = addOption.optionType
    switch (optionType) {
        case ExecutorOptionType.LZ_RECEIVE:
            baseOptions.addExecutorLzReceiveOption(addOption.gas, addOption.value)
            break
        case ExecutorOptionType.NATIVE_DROP:
            baseOptions.addExecutorNativeDropOption(addOption.amount, addOption.receiver)
            break
        case ExecutorOptionType.COMPOSE:
            baseOptions.addExecutorComposeOption(Number(addOption.gas), addOption.value)
            break
        case ExecutorOptionType.ORDERED:
            baseOptions.addExecutorOrderedExecutionOption()
            break
        case ExecutorOptionType.LZ_READ:
            baseOptions.addExecutorLzReadOption(addOption.gas, addOption.value)
            break
        default:
            throw new Error(`Unknown option type: ${optionType}`)
    }

    return baseOptions
}

export async function getEnforcedOption(oappContract: Contract, eid: string, msgTypes: number): Promise<string> {
    const options = await oappContract.enforcedOptions(eid, msgTypes)

    return options
}
