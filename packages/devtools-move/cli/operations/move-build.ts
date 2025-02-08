import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { build } from '../../tasks/move/build'

import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'

import {
    getLzConfig,
    getMoveVMContracts,
    promptUserContractSelection,
    getMoveTomlAdminName,
    ownerNotSetMessage,
} from '../../tasks/move/utils/config'

class MoveBuildOperation implements INewOperation {
    vm = 'move'
    operation = 'build'
    description = 'Build Aptos Move contracts'
    reqArgs = ['oapp_config', 'named_addresses']

    addArgs = [
        {
            name: '--chain',
            arg: {
                help: 'The chain to build the contracts for',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        const lzConfig = await getLzConfig(args.oapp_config)
        const moveVMContracts = getMoveVMContracts(lzConfig)
        const selectedContract = await promptUserContractSelection(moveVMContracts)
        const lzNetwork = getNetworkForChainId(selectedContract.contract.eid)
        const chainName = lzNetwork.chainName
        const stage = lzNetwork.env
        const forceBuild = args.force_build ? true : false
        if (!selectedContract.config?.owner) {
            throw new Error(ownerNotSetMessage)
        }
        const oAppOwner = selectedContract.config?.owner
        const moveTomlAdminName = getMoveTomlAdminName(args.oapp_type)
        const named_addresses = `${args.address_name}=${oAppOwner},${moveTomlAdminName}=${oAppOwner}`

        await build(chainName, forceBuild, named_addresses, args.address_name, stage)
    }
}

const NewOperation = new MoveBuildOperation()
export { NewOperation }
