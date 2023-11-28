import { expect } from 'chai'
import hre from 'hardhat'
import { describe } from 'mocha'
import { eidAndDeploymentToPoint, OmniGraphBuilderHardhat } from '@layerzerolabs/ua-utils-evm-hardhat'
import { getNetworkRuntimeEnvironment } from '@layerzerolabs/utils-evm-hardhat'
import { arePointsEqual, OmniPoint } from '@layerzerolabs/ua-utils'
import assert from 'assert'

describe('builder', () => {
    it('should collect all deployed DefaultOApp contracts', async () => {
        const britneyEnv = await getNetworkRuntimeEnvironment('britney')
        const vengaboysEnv = await getNetworkRuntimeEnvironment('vengaboys')

        assert(britneyEnv.network.config.endpointId, 'Missing endpointId on britney network')
        assert(vengaboysEnv.network.config.endpointId, 'Missing endpointId on vengaboys network')

        const britneyDeployment = await britneyEnv.deployments.get('DefaultOApp')
        const vengaboysDeployment = await vengaboysEnv.deployments.get('DefaultOApp')

        const britneyPoint: OmniPoint = eidAndDeploymentToPoint(britneyEnv.network.config.endpointId, britneyDeployment)
        const vengaboysPoint: OmniPoint = eidAndDeploymentToPoint(
            vengaboysEnv.network.config.endpointId,
            vengaboysDeployment
        )

        const builder = await OmniGraphBuilderHardhat.fromDeployedContract(hre, 'DefaultOApp')

        expect(builder.graph).to.eql({
            contracts: [
                {
                    point: vengaboysPoint,
                    config: undefined,
                },
                {
                    point: britneyPoint,
                    config: undefined,
                },
            ],
            connections: [],
        })
    })

    it('should collect all newly deployed DefaultOApp contracts', async () => {
        const britneyEnv = await getNetworkRuntimeEnvironment('britney')
        const vengaboysEnv = await getNetworkRuntimeEnvironment('vengaboys')

        assert(britneyEnv.network.config.endpointId, 'Missing endpointId on britney network')
        assert(vengaboysEnv.network.config.endpointId, 'Missing endpointId on vengaboys network')

        const oldBritneyDeployment = await britneyEnv.deployments.get('DefaultOApp')
        const oldVengaboysDeployment = await vengaboysEnv.deployments.get('DefaultOApp')

        const oldBritneyPoint: OmniPoint = eidAndDeploymentToPoint(
            britneyEnv.network.config.endpointId,
            oldBritneyDeployment
        )
        const oldVengaboysPoint: OmniPoint = eidAndDeploymentToPoint(
            vengaboysEnv.network.config.endpointId,
            oldVengaboysDeployment
        )

        // First we create a builder using the redeployed contracts
        const oldBuilder = await OmniGraphBuilderHardhat.fromDeployedContract(hre, 'DefaultOApp')

        // Now we redeploy one of the contracts
        const [_, deployer] = await britneyEnv.getUnnamedAccounts()
        assert(deployer, 'Missing deployer')

        await britneyEnv.deployments.delete('DefaultOApp')
        const newBritneyDeployment = await britneyEnv.deployments.deploy('DefaultOApp', {
            from: deployer,
        })

        const newBritneyPoint: OmniPoint = eidAndDeploymentToPoint(
            britneyEnv.network.config.endpointId,
            newBritneyDeployment
        )

        // As a sanity check, we make sure the deployment has actually changed
        expect(arePointsEqual(newBritneyPoint, oldBritneyPoint)).to.be.false

        const builder = await OmniGraphBuilderHardhat.fromDeployedContract(hre, 'DefaultOApp')

        expect(oldBuilder.graph).not.to.eql(builder.graph)
        expect(builder.graph).to.eql({
            contracts: [
                {
                    point: oldVengaboysPoint,
                    config: undefined,
                },
                {
                    point: newBritneyPoint,
                    config: undefined,
                },
            ],
            connections: [],
        })
    })
})
