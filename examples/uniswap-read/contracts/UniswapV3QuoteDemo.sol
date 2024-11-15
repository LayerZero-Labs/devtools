// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import necessary interfaces and contracts
import { IQuoterV2 } from "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { ILayerZeroEndpointV2, MessagingFee, MessagingReceipt, Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { AddressCast } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/AddressCast.sol";

import { ReadCodecV1, EVMCallComputeV1, EVMCallRequestV1 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/ReadCodecV1.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OAppRead } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppRead.sol";

/**
 * @title UniswapV3QuoteDemo
 * @notice Simplified contract to query WETH/USDC prices on three chains and compute their average using LayerZero and Uniswap V3 QuoterV2.
 * @dev Extends OAppRead and OAppOptionsType3 for cross-chain read and compute operations.
 */
contract UniswapV3QuoteDemo is OAppRead, OAppOptionsType3 {
    /// @notice Emitted when the aggregated average token price is computed and received.
    /// @param averagePrice The calculated average token price (USDC amount).
    event AggregatedPrice(uint256 averagePrice);

    /// @notice LayerZero read message type.
    uint8 private constant READ_MSG_TYPE = 1;

    /// @notice LayerZero read channel ID.
    uint32 public READ_CHANNEL;

    /// @notice Struct to hold chain-specific configurations.
    struct ChainConfig {
        uint16 confirmations; // Number of confirmations required
        address quoterAddress; // Address of the Uniswap V3 QuoterV2 contract
        address tokenInAddress; // Address of WETH on the target chain
        address tokenOutAddress; // Address of USDC on the target chain
        uint24 fee; // Pool fee for WETH/USDC pair
    }

    /// @notice Array to store all active targetEids for iteration.
    uint32[] public targetEids;

    /// @notice Mapping to store chain configurations indexed by target chain ID (targetEid).
    mapping(uint32 => ChainConfig) public chainConfigs;

    // ===========================
    // ======== CONSTANTS ========
    // ===========================

    // Define constants for chain endpoint ids and addresses for clarity.

    // Example Chain A: Ethereum Mainnet
    uint32 public constant CHAIN_A_EID = 30101; // LayerZero EID for Ethereum Mainnet
    address public constant CHAIN_A_QUOTER = 0x61fFE014bA17989E743c5F6cB21bF9697530B21e; // Uniswap V3 QuoterV2 on Ethereum Mainnet
    address public constant CHAIN_A_WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // WETH on Ethereum Mainnet
    address public constant CHAIN_A_USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // USDC on Ethereum Mainnet
    uint24 public constant CHAIN_A_FEE = 3000; // 0.3% pool fee

    // Example Chain B: Base Mainnet
    uint32 public constant CHAIN_B_EID = 30184; // LayerZero EID for Base Mainnet
    address public constant CHAIN_B_QUOTER = 0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a; // Replace with actual QuoterV2 address on Base Mainnet
    address public constant CHAIN_B_WETH = 0x4200000000000000000000000000000000000006; // WETH on Base Mainnet
    address public constant CHAIN_B_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // USDC on Base Mainnet
    uint24 public constant CHAIN_B_FEE = 3000; // 0.3% pool fee

    // Example Chain C: Optimism Mainnet
    uint32 public constant CHAIN_C_EID = 30111; // LayerZero EID for Optimism Mainnet
    address public constant CHAIN_C_QUOTER = 0x61fFE014bA17989E743c5F6cB21bF9697530B21e; // Replace with actual QuoterV2 address on Optimism Mainnet
    address public constant CHAIN_C_WETH = 0x4200000000000000000000000000000000000006; // WETH on Optimism Mainnet
    address public constant CHAIN_C_USDC = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85; // USDC on Optimism Mainnet
    uint24 public constant CHAIN_C_FEE = 3000; // 0.3% pool fee

    // ===========================
    // ======== CONSTRUCTOR =======
    // ===========================

    /**
     * @notice Constructor to initialize the UniswapQuoteDemo contract with hardcoded chain configurations.
     * @param _endpoint The LayerZero endpoint contract address.
     * @param _readChannel The LayerZero read channel ID.
     */
    constructor(address _endpoint, uint32 _readChannel) OAppRead(_endpoint, msg.sender) Ownable(msg.sender) {
        // Initialize Chain A Configuration (Ethereum Mainnet)
        ChainConfig memory chainAConfig = ChainConfig({
            confirmations: 5,
            quoterAddress: CHAIN_A_QUOTER,
            tokenInAddress: CHAIN_A_WETH,
            tokenOutAddress: CHAIN_A_USDC,
            fee: CHAIN_A_FEE
        });

        // Initialize Chain B Configuration (Base Mainnet)
        ChainConfig memory chainBConfig = ChainConfig({
            confirmations: 5,
            quoterAddress: CHAIN_B_QUOTER,
            tokenInAddress: CHAIN_B_WETH,
            tokenOutAddress: CHAIN_B_USDC,
            fee: CHAIN_B_FEE
        });

        // Initialize Chain C Configuration (Optimism Mainnet)
        ChainConfig memory chainCConfig = ChainConfig({
            confirmations: 5,
            quoterAddress: CHAIN_C_QUOTER,
            tokenInAddress: CHAIN_C_WETH,
            tokenOutAddress: CHAIN_C_USDC,
            fee: CHAIN_C_FEE
        });

        // Set Chain A Configuration
        chainConfigs[CHAIN_A_EID] = chainAConfig;
        targetEids.push(CHAIN_A_EID);

        // Set Chain B Configuration
        chainConfigs[CHAIN_B_EID] = chainBConfig;
        targetEids.push(CHAIN_B_EID);

        // Set Chain C Configuration
        chainConfigs[CHAIN_C_EID] = chainCConfig;
        targetEids.push(CHAIN_C_EID);

        // Set the read channel
        READ_CHANNEL = _readChannel;
        _setPeer(READ_CHANNEL, AddressCast.toBytes32(address(this)));
    }

    // ===========================
    // ======= FUNCTIONS =========
    // ===========================

    /**
     * @notice Sets the LayerZero read channel, enabling or disabling it based on `_active`.
     * @param _channelId The channel ID to set.
     * @param _active Flag to activate or deactivate the channel.
     */
    function setReadChannel(uint32 _channelId, bool _active) public override onlyOwner {
        _setPeer(_channelId, _active ? AddressCast.toBytes32(address(this)) : bytes32(0));
        READ_CHANNEL = _channelId;
    }

    /**
     * @notice Sends a read request to LayerZero, querying Uniswap QuoterV2 for WETH/USDC prices on configured chains.
     * @param _extraOptions Additional messaging options, including gas and fee settings.
     * @return receipt The LayerZero messaging receipt for the request.
     */
    function readAverageUniswapPrice(
        bytes calldata _extraOptions
    ) external payable returns (MessagingReceipt memory receipt) {
        bytes memory cmd = getCmd();
        return
            _lzSend(
                READ_CHANNEL,
                cmd,
                combineOptions(READ_CHANNEL, READ_MSG_TYPE, _extraOptions),
                MessagingFee(msg.value, 0),
                payable(msg.sender)
            );
    }

    /**
     * @notice Quotes the estimated messaging fee for querying Uniswap QuoterV2 for WETH/USDC prices.
     * @param _extraOptions Additional messaging options.
     * @param _payInLzToken Boolean flag indicating whether to pay in LayerZero tokens.
     * @return fee The estimated messaging fee.
     */
    function quoteAverageUniswapPrice(
        bytes calldata _extraOptions,
        bool _payInLzToken
    ) external view returns (MessagingFee memory fee) {
        bytes memory cmd = getCmd();
        return _quote(READ_CHANNEL, cmd, combineOptions(READ_CHANNEL, READ_MSG_TYPE, _extraOptions), _payInLzToken);
    }

    /**
     * @notice Constructs a command to query the Uniswap QuoterV2 for WETH/USDC prices on all configured chains.
     * @return cmd The encoded command to request Uniswap quotes.
     */
    function getCmd() public view returns (bytes memory) {
        uint256 pairCount = targetEids.length;
        EVMCallRequestV1[] memory readRequests = new EVMCallRequestV1[](pairCount);

        for (uint256 i = 0; i < pairCount; i++) {
            uint32 targetEid = targetEids[i];
            ChainConfig memory config = chainConfigs[targetEid];

            // Define the QuoteExactInputSingleParams
            IQuoterV2.QuoteExactInputSingleParams memory params = IQuoterV2.QuoteExactInputSingleParams({
                tokenIn: config.tokenInAddress,
                tokenOut: config.tokenOutAddress,
                amountIn: 1 ether, // amountIn: 1 WETH
                fee: config.fee,
                sqrtPriceLimitX96: 0 // No price limit
            });

            // @notice Encode the function call
            // @dev From Uniswap Docs, this function is not marked view because it relies on calling non-view
            // functions and reverting to compute the result. It is also not gas efficient and should not
            // be called on-chain. We take advantage of lzRead to call this function off-chain and get the result
            // returned back on-chain to the OApp's _lzReceive method.
            // https://docs.uniswap.org/contracts/v3/reference/periphery/interfaces/IQuoterV2
            bytes memory callData = abi.encodeWithSelector(IQuoterV2.quoteExactInputSingle.selector, params);

            readRequests[i] = EVMCallRequestV1({
                appRequestLabel: uint16(i + 1),
                targetEid: targetEid,
                isBlockNum: false,
                blockNumOrTimestamp: uint64(block.timestamp),
                confirmations: config.confirmations,
                to: config.quoterAddress,
                callData: callData
            });
        }

        EVMCallComputeV1 memory computeSettings = EVMCallComputeV1({
            computeSetting: 2, // lzMap() and lzReduce()
            targetEid: ILayerZeroEndpointV2(endpoint).eid(),
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 15,
            to: address(this)
        });

        return ReadCodecV1.encode(0, readRequests, computeSettings);
    }

    /**
     * @notice Processes individual Uniswap QuoterV2 responses, encoding the result.
     * @param _response The response from the read request.
     * @return Encoded token output amount (USDC amount).
     */
    function lzMap(bytes calldata, bytes calldata _response) external pure returns (bytes memory) {
        require(_response.length >= 32, "Invalid response length"); // quoteExactInputSingle returns multiple values

        // Decode the response to extract amountOut
        (uint256 amountOut, , , ) = abi.decode(_response, (uint256, uint160, uint32, uint256));
        return abi.encode(amountOut);
    }

    /**
     * @notice Aggregates individual token output amounts to compute an average.
     * @param _responses Array of mapped responses containing token output amounts.
     * @return Encoded average token output amount.
     */
    function lzReduce(bytes calldata, bytes[] calldata _responses) external pure returns (bytes memory) {
        require(_responses.length == 3, "Expected responses from 3 chains");
        uint256 total = 0;
        for (uint256 i = 0; i < _responses.length; i++) {
            uint256 amountOut = abi.decode(_responses[i], (uint256));
            total += amountOut;
        }
        uint256 averageAmountOut = total / _responses.length;
        return abi.encode(averageAmountOut);
    }

    /**
     * @notice Handles the aggregated average quote received from LayerZero.
     * @dev Emits the AggregatedPrice event with the calculated average amount.
     * @param _message Encoded average token output amount.
     */
    function _lzReceive(
        Origin calldata,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address,
        bytes calldata
    ) internal override {
        require(_message.length == 32, "Invalid message length");
        uint256 averagePrice = abi.decode(_message, (uint256));
        emit AggregatedPrice(averagePrice);
    }

    /// @notice Allows the contract to receive Ether.
    receive() external payable {}
}
