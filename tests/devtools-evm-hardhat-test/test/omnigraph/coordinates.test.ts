import 'hardhat'
import {
    createContractFactory,
    createProviderFactory,
    getEidForNetworkName,
    getHreByNetworkName,
} from '@layerzerolabs/devtools-evm-hardhat'
import assert from 'assert'

describe('omnigraph/coordinates', () => {
    describe('createContractFactory', () => {
        it('should have all contract methods for proxy deployments', async () => {
            const env = await getHreByNetworkName('britney')
            const eid = getEidForNetworkName('britney')

            // Get the deployer account
            const [deployer] = await env.getUnnamedAccounts()
            assert(deployer, 'Missing deployer account')

            // Deploy the TestProxy contract
            await env.deployments.deploy('TestProxy', {
                from: deployer,
                proxy: {
                    owner: deployer,
                    proxyContract: 'OptimizedTransparentProxy',
                    execute: {
                        init: {
                            methodName: 'initialize',
                            args: [],
                        },
                    },
                },
            })

            // Now we create a contract factory and observe that the resulting contract has all the contract methods
            const contractFactory = createContractFactory()
            const { contract } = await contractFactory({ contractName: 'TestProxy', eid })

            // We check for existence of the instance method from the actual contract
            expect(contract.contractMethod).toBeInstanceOf(Function)

            // And the existence of the proxy methods
            expect(contract.implementation).toBeInstanceOf(Function)
            expect(contract.functions).toMatchSnapshot()

            // Now let's try and execute a contract method
            const provider = await createProviderFactory()(eid)
            const connectedContract = contract.connect(provider)

            // We execute a contract method
            const contractMethodResult = await connectedContract.contractMethod()
            expect(contractMethodResult.toNumber()).toBe(100)
        })
    })
})
