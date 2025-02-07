import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { build } from '../../tasks/move/build'
import { deploy } from '../../tasks/move/deploy'
import { setDelegate } from '../../tasks/move/setDelegate'

import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'

import {
    getLzConfig,
    getMoveVMContracts,
    promptUserContractSelection,
    getMoveTomlAdminName,
    getAptosAccountAddress,
    getInitiaAccountAddress,
    ownerNotSetMessage,
} from '../../tasks/move/utils/config'

class MoveDeployOperation implements INewOperation {
    vm = 'move'
    operation = 'deploy'
    description = 'Deploy Aptos Move contracts'
    reqArgs = ['oapp_config', 'address_name']

    addArgs = [
        {
            name: '--address-name',
            arg: {
                help: 'The named address for compiling and using in the contract. This will take the derived account address for the object and put it in this location',
                required: false,
            },
        },
        {
            name: '--oapp-type',
            arg: {
                help: 'The type of OApp that is being deployed. Options are "oapp" and "oft". Use type "oft" for any OFTs including adapters.',
                required: false,
            },
        },
        {
            name: '--force-build',
            arg: {
                help: 'Force the build to run even if the Aptos CLI version is too old.',
                required: false,
            },
        },
        {
            name: '--force-deploy',
            arg: {
                help: 'Force the deploy to run even if the Aptos CLI version is too old.',
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
        const forceDeploy = args.force_deploy ? true : false

        if (!selectedContract.config?.owner) {
            throw new Error(ownerNotSetMessage)
        }
        const oAppOwner = selectedContract.config?.owner
        const moveTomlAdminName = getMoveTomlAdminName(args.oapp_type)

        let named_addresses = ''
        let accountAddress = ''
        if (chainName === 'movement' || chainName === 'aptos') {
            named_addresses = `${args.address_name}=${oAppOwner},${moveTomlAdminName}=${oAppOwner}`
            accountAddress = getAptosAccountAddress()

            await build(chainName, forceBuild, named_addresses, args.address_name, stage)
        } else if (chainName === 'initia') {
            named_addresses = `${moveTomlAdminName}=${oAppOwner}`
            accountAddress = getInitiaAccountAddress()
        } else {
            throw new Error(`lz:sdk:move:deploy does not support ${chainName}-${stage}.`)
        }

        await deploy(args.address_name, named_addresses, forceDeploy, selectedContract, chainName, stage)

        await setDelegate(accountAddress, lzConfig, stage, chainName, selectedContract.contract.eid)
    }
}

const NewOperation = new MoveDeployOperation()
export { NewOperation }
