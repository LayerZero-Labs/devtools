import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import { deployments, ethers } from 'hardhat'

import { Options } from '@layerzerolabs/lz-v2-utilities'

describe('MyNativeOFTAdapter Test', function () {
    // Constant representing a mock Endpoint ID for testing purposes
    const eidA = 1
    const eidB = 2
    // Declaration of variables to be used in the test suite
    let MyNativeOFTAdapter: ContractFactory
    let MyOFT: ContractFactory
    let EndpointV2Mock: ContractFactory
    let ownerA: SignerWithAddress
    let ownerB: SignerWithAddress
    let endpointOwner: SignerWithAddress
    let myNativeOFTAdapter: Contract
    let myOFTB: Contract
    let mockEndpointV2A: Contract
    let mockEndpointV2B: Contract

    // Before hook for setup that runs once before all tests in the block
    before(async function () {
        // Contract factory for our tested contract
        //
        // We are using a derived contract that exposes a mint() function for testing purposes
        MyNativeOFTAdapter = await ethers.getContractFactory('MyNativeOFTAdapterMock')

        MyOFT = await ethers.getContractFactory('MyOFTMock')

        // Fetching the first three signers (accounts) from Hardhat's local Ethereum network
        const signers = await ethers.getSigners()

        ;[ownerA, ownerB, endpointOwner] = signers

        // The EndpointV2Mock contract comes from @layerzerolabs/test-devtools-evm-hardhat package
        // and its artifacts are connected as external artifacts to this project
        //
        // Unfortunately, hardhat itself does not yet provide a way of connecting external artifacts,
        // so we rely on hardhat-deploy to create a ContractFactory for EndpointV2Mock
        //
        // See https://github.com/NomicFoundation/hardhat/issues/1040
        const EndpointV2MockArtifact = await deployments.getArtifact('EndpointV2Mock')
        EndpointV2Mock = new ContractFactory(EndpointV2MockArtifact.abi, EndpointV2MockArtifact.bytecode, endpointOwner)
    })

    // beforeEach hook for setup that runs before each test in the block
    beforeEach(async function () {
        // Deploying a mock LZEndpoint with the given Endpoint ID
        mockEndpointV2A = await EndpointV2Mock.deploy(eidA)
        mockEndpointV2B = await EndpointV2Mock.deploy(eidB)

        // Deploying contracts and linking them to the mock LZEndpoint
        myNativeOFTAdapter = await MyNativeOFTAdapter.deploy(18, mockEndpointV2A.address, ownerA.address)
        myOFTB = await MyOFT.deploy('myOFTB', 'bOFT', mockEndpointV2B.address, ownerB.address)

        // Setting destination endpoints in the LZEndpoint mock for each MyOFT instance
        await mockEndpointV2A.setDestLzEndpoint(myOFTB.address, mockEndpointV2B.address)
        await mockEndpointV2B.setDestLzEndpoint(myNativeOFTAdapter.address, mockEndpointV2A.address)

        // Setting peers in the mock LZEndpoint
        await myNativeOFTAdapter.connect(ownerA).setPeer(eidB, ethers.utils.zeroPad(myOFTB.address, 32))
        await myOFTB.connect(ownerB).setPeer(eidA, ethers.utils.zeroPad(myNativeOFTAdapter.address, 32))
    })

    // A test case to verify native transfer functionality
    it('should send native from A address to B address via NativeOFTAdapter', async function () {
        const initialBalanceA = await ethers.provider.getBalance(ownerA.address)

        // Defining the amount of native to send and constructing the parameters for the send operation
        const amountToSend = ethers.utils.parseEther('1')

        // Defining extra message execution options for the send operation
        const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString()

        const sendParam = [
            eidB,
            ethers.utils.zeroPad(ownerB.address, 32),
            amountToSend,
            amountToSend,
            options,
            '0x',
            '0x',
        ]

        // Fetching the native fee for the token send operation
        const [nativeFee] = await myNativeOFTAdapter.connect(ownerA).quoteSend(sendParam, false)

        const msgValue = nativeFee.add(await myNativeOFTAdapter.removeDust(amountToSend))

        // Executing the send operation from myNativeOFTAdapter contract
        const tx = await myNativeOFTAdapter
            .connect(ownerA)
            .send(sendParam, [nativeFee, 0], ownerA.address, { value: msgValue })
        const receipt = await tx.wait()

        // Fetching the final balances of ownerA, ownerB, and adapter
        const finalBalanceA = await ethers.provider.getBalance(ownerA.address)
        const finalBalanceAdapter = await ethers.provider.getBalance(myNativeOFTAdapter.address)
        const finalBalanceB = await myOFTB.balanceOf(ownerB.address)

        const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice)
        const expectedFinalBalanceA = initialBalanceA.sub(msgValue.add(gasUsed))

        // Asserting that the final balances are as expected after the send operation
        expect(finalBalanceA).eql(expectedFinalBalanceA)
        expect(finalBalanceAdapter).eql(amountToSend)
        expect(finalBalanceB).eql(amountToSend)
    })
})
