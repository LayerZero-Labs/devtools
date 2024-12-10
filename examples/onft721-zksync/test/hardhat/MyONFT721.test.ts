import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import { deployments, ethers } from 'hardhat'

import { Options } from '@layerzerolabs/lz-v2-utilities'

describe('MyONFT721 Test', function () {
    // Constant representing a mock Endpoint ID for testing purposes
    const eidA = 1
    const eidB = 2
    // Declaration of variables to be used in the test suite
    let MyONFT721: ContractFactory
    let EndpointV2Mock: ContractFactory
    let ownerA: SignerWithAddress
    let ownerB: SignerWithAddress
    let endpointOwner: SignerWithAddress
    let myONFT721A: Contract
    let myONFT721B: Contract
    let mockEndpointV2A: Contract
    let mockEndpointV2B: Contract

    // Before hook for setup that runs once before all tests in the block
    before(async function () {
        // Contract factory for our tested contract
        //
        // We are using a derived contract that exposes a mint() function for testing purposes
        MyONFT721 = await ethers.getContractFactory('MyONFT721Mock')

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

        // Deploying two instances of MyOFT contract with different identifiers and linking them to the mock LZEndpoint
        myONFT721A = await MyONFT721.deploy('aONFT721', 'aONFT721', mockEndpointV2A.address, ownerA.address)
        myONFT721B = await MyONFT721.deploy('bONFT721', 'bONFT721', mockEndpointV2B.address, ownerB.address)

        // Setting destination endpoints in the LZEndpoint mock for each MyONFT721 instance
        await mockEndpointV2A.setDestLzEndpoint(myONFT721B.address, mockEndpointV2B.address)
        await mockEndpointV2B.setDestLzEndpoint(myONFT721A.address, mockEndpointV2A.address)

        // Setting each MyONFT721 instance as a peer of the other in the mock LZEndpoint
        await myONFT721A.connect(ownerA).setPeer(eidB, ethers.utils.zeroPad(myONFT721B.address, 32))
        await myONFT721B.connect(ownerB).setPeer(eidA, ethers.utils.zeroPad(myONFT721A.address, 32))
    })

    // A test case to verify token transfer functionality
    it('should send a token from A address to B address', async function () {
        // Minting an initial amount of tokens to ownerA's address in the myONFT721A contract
        const initialTokenId = 0
        await myONFT721A.mint(ownerA.address, initialTokenId)

        // Defining extra message execution options for the send operation
        const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString()

        const sendParam = [eidB, ethers.utils.zeroPad(ownerB.address, 32), initialTokenId, options, '0x', '0x']

        // Fetching the native fee for the token send operation
        const [nativeFee] = await myONFT721A.quoteSend(sendParam, false)

        // Executing the send operation from myONFT721A contract
        await myONFT721A.send(sendParam, [nativeFee, 0], ownerA.address, { value: nativeFee })

        // Fetching the final token balances of ownerA and ownerB
        const finalBalanceA = await myONFT721A.balanceOf(ownerA.address)
        const finalBalanceB = await myONFT721B.balanceOf(ownerB.address)

        // Asserting that the final balances are as expected after the send operation
        expect(finalBalanceA).eql(ethers.BigNumber.from(0))
        expect(finalBalanceB).eql(ethers.BigNumber.from(1))
    })
})
