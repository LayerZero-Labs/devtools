import { Contract } from 'ethers'

import { ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities-v3'

import { diffPrinter } from '../../shared/utils'

import type { ContractMetadataMapping, EidTxMap, NonEvmOAppMetadata, eid, enforcedOptionParam } from '../utils/types'

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

    for (const [_eid, { address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        const eid = parseInt(_eid) as eid
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

        const diffFromOptions: Record<number, string> = {}
        const diffToOptions: Record<number, string> = {}

        for (const msgType of msgTypes) {
            const fromOptions = await getEnforcedOption(contract.oapp, eid, msgType)
            const toOptions = thisEnforcedOptionBuilder[msgType].toHex()

            if (fromOptions === toOptions) {
                console.log(
                    `\x1b[43m Skipping: The same enforced options have been set for ${eid} @ ${address.oapp} \x1b[0m`
                )
            } else {
                diffFromOptions[msgType] = fromOptions
                diffToOptions[msgType] = toOptions

                enforcedOptionParams.push({
                    eid: eid,
                    msgType: msgType,
                    options: toOptions,
                })

                diffPrinter(`Setting Enforced Options on ${eid}`, diffFromOptions, diffToOptions)

                const tx = await contract.oapp.populateTransaction.setEnforcedOptions(enforcedOptionParams)

                if (!txTypePool[_eid]) {
                    txTypePool[_eid] = []
                }

                txTypePool[_eid].push(tx)
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

export async function getEnforcedOption(oappContract: Contract, eid: eid, msgTypes: number): Promise<string> {
    const options = await oappContract.enforcedOptions(eid, msgTypes)

    return options
}
