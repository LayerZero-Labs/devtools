import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import { deployments, ethers } from 'hardhat'

import { Options } from '@layerzerolabs/lz-v2-utilities'

describe('MyOFT Test', function () {
    // Constant representing a mock Endpoint ID for testing purposes
    const eidA = 1
    const eidB = 2
    // Declaration of variables to be used in the test suite
    let MyOFT: ContractFactory
    let EndpointV2Mock: ContractFactory
    let ownerA: SignerWithAddress
    let ownerB: SignerWithAddress
    let endpointOwner: SignerWithAddress
    let myOFTA: Contract
    let myOFTB: Contract
    let mockEndpointA: Contract
    let mockEndpointB: Contract

    // Before hook for setup that runs once before all tests in the block
    before(async function () {
        // Contract factory for our tested contract
        MyOFT = await ethers.getContractFactory('MyOFT')
        // Fetching the first two signers (accounts) from Hardhat's local Ethereum network
        ;[ownerA, ownerB, endpointOwner] = await ethers.getSigners()

        // The EndpointV2Mock contract comes from @layerzerolabs/test-devtools-evm-hardhat package
        // and its artifacts are connected as external artifacts to this project
        //
        // Unfortunately, hardhat itself does not yet provide a way of connecting external artifacts
        // so we rely on hardhat-deploy to create a ContractFactory for EndpointV2Mock
        //
        // See https://github.com/NomicFoundation/hardhat/issues/1040
        const EndpointV2MockArtifact = await deployments.getArtifact('EndpointV2Mock')
        EndpointV2Mock = new ContractFactory(EndpointV2MockArtifact.abi, EndpointV2MockArtifact.bytecode, endpointOwner)
    })

    // beforeEach hook for setup that runs before each test in the block
    beforeEach(async function () {
        // Deploying a mock LZEndpoint with the given Endpoint ID
        mockEndpointA = await EndpointV2Mock.deploy(eidA)
        mockEndpointB = await EndpointV2Mock.deploy(eidB)

        // Deploying two instances of MyOFT contract with different identifiers and linking them to the mock LZEndpoint
        myOFTA = await MyOFT.deploy('aOFT', 'aOFT', mockEndpointA.address, ownerA.address)
        myOFTB = await MyOFT.deploy('bOFT', 'bOFT', mockEndpointB.address, ownerB.address)

        // Setting destination endpoints in the LZEndpoint mock for each MyOFT instance
        await mockEndpointA.setDestLzEndpoint(myOFTB.address, mockEndpointB.address)
        await mockEndpointB.setDestLzEndpoint(myOFTA.address, mockEndpointA.address)

        // Setting each MyOFT instance as a peer of the other in the mock LZEndpoint
        await myOFTA.connect(ownerA).setPeer(eidB, ethers.utils.zeroPad(myOFTB.address, 32))
        await myOFTB.connect(ownerB).setPeer(eidA, ethers.utils.zeroPad(myOFTA.address, 32))
    })

    // A test case to verify token transfer functionality
    it('sends a token from A address to B address via each OFT', async function () {
        // Minting an initial amount of tokens to ownerA's address in the myOFTA contract
        const initialAmount = ethers.utils.parseEther('100')
        await myOFTA.mint(ownerA.address, initialAmount)

        // Defining the amount of tokens to send and constructing the parameters for the send operation
        const tokensToSend = ethers.utils.parseEther('1')
        const sendParam = [eidB, ethers.utils.zeroPad(ownerB.address, 32), tokensToSend, tokensToSend]

        // Defining extra message execution options for the send operation
        const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString()

        // Fetching the native fee for the token send operation
        const [nativeFee] = await myOFTA.quoteSend(sendParam, options, false, `0x`, `0x`)

        // Executing the send operation from myOFTA contract
        await myOFTA.send(sendParam, options, [nativeFee, 0], ownerA.address, '0x', '0x', { value: nativeFee })

        // Fetching the final token balances of ownerA and ownerB
        const finalBalanceA = await myOFTA.balanceOf(ownerA.address)
        const finalBalanceB = await myOFTB.balanceOf(ownerB.address)

        // Asserting that the final balances are as expected after the send operation
        expect(finalBalanceA.eq(initialAmount.sub(tokensToSend))).to.be.true
        expect(finalBalanceB.eq(tokensToSend)).to.be.true
    })
})
