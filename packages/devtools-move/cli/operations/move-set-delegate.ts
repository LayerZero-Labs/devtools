import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { setDelegate } from '../../tasks/move/setDelegate'
import {
    getLzConfig,
    getMoveVMContracts,
    promptUserContractSelection,
    getAptosAccountAddress,
    getInitiaAccountAddress,
} from '../../tasks/move/utils/config'
import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'

class MoveDeployOperation implements INewOperation {
    vm = 'move'
    operation = 'set-delegate'
    description = 'Set Aptos Move delegate'
    reqArgs = ['oapp_config']

    async impl(args: any): Promise<void> {
        const lzConfig = await getLzConfig(args.oapp_config)
        const moveVMContracts = getMoveVMContracts(lzConfig)
        const selectedContract = await promptUserContractSelection(moveVMContracts)
        const lzNetwork = getNetworkForChainId(selectedContract.contract.eid)
        const chainName = lzNetwork.chainName
        const stage = lzNetwork.env

        let accountAddress = ''
        if (chainName === 'movement' || chainName === 'aptos') {
            accountAddress = getAptosAccountAddress(chainName)
        } else if (chainName === 'initia') {
            accountAddress = getInitiaAccountAddress()
        } else {
            throw new Error(`lz:sdk:move:deploy does not support ${chainName}-${stage}.`)
        }
        await setDelegate(accountAddress, lzConfig, stage, chainName, selectedContract.contract.eid)
    }
}

const NewOperation = new MoveDeployOperation()
export { NewOperation }
