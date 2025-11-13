// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

import { ILayerZeroComposer } from '@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroComposer.sol';
import { OFTComposeMsgCodec } from '@layerzerolabs/lz-evm-oapp-v2/contracts/oft/libs/OFTComposeMsgCodec.sol';
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { IStargate } from '@stargatefinance/stg-evm-v2/src/interfaces/IStargate.sol';

import { IAaveV3Composer } from './IAaveV3Composer.sol';
import { IPool } from './IAaveV3Pool.sol';

/**
 * @title AaveV3Composer
 *
 * @notice Supplies the received tokens into Aave V3 liquidity pools after an lzCompose call.
 *
 * @dev The contract enforces strict authentication, decodes lzCompose payloads, and either supplies tokens into Aave
 *      or refunds the recipient if the supply reverts.
 */
contract AaveV3Composer is ILayerZeroComposer, IAaveV3Composer {
    using SafeERC20 for IERC20;

    /// @notice Aave V3 pool that receives supplied liquidity.
    IPool public immutable AAVE;

    /// @notice LayerZero Endpoint trusted to invoke `lzCompose`.
    address public immutable ENDPOINT;

    /// @notice Stargate OFT that is authorized to trigger Aave supplies on this chain.
    address public immutable STARGATE;

    /// @notice Underlying ERC20 token that backs the trusted Stargate OFT.
    address public immutable TOKEN_IN;

    // ──────────────────────────────────────────────────────────────────────────────
    // 0. Setup & Constructor
    //    • Validates constructor inputs
    //    • Caches protocol addresses
    //    • Grants a one-time approval for Aave supplies
    //
    //    ↳  Docs: https://docs.layerzero.network/v2/developers/evm/composer/overview
    //           https://docs.layerzero.network/v2/developers/evm/oft/quickstart#send-tokens--call-composer
    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Deploys the composer and connects it to Stargate and Aave pools.
     * 
     * @dev  Assuming the Stargate contract is already configured with the correct LayerZero Endpoint.
     *       
     *       A **one-time `maxApprove`** is granted to the Aave Pool because:
     *         1. Funds only arrive via `lzReceive` → `lzCompose` from the trusted Stargate Pool.
     *         2. The pool can only transfer what the composeMsg allows.
     *         3. Saves ~5k gas on every compose execution.
     *
     * @param _aavePool Address of the target Aave V3 pool.
     * @param _stargatePool StargatePool expected to receive the supplied tokens.
     */
    constructor(
        address _aavePool,
        address _stargatePool
    ) {
        if (_aavePool == address(0)) revert InvalidAavePool();
        if (_stargatePool == address(0)) revert InvalidStargatePool();

        // Initialize the Aave pool.
        AAVE = IPool(_aavePool);
        
        // Initialize the Stargate Pool.
        STARGATE = _stargatePool;

        // Gran the endpoint from the StargatePool.
        ENDPOINT = address(IOAppCore(STARGATE).endpoint());

        // Grab the underlying token from the StargatePool.
        TOKEN_IN = IStargate(_stargatePool).token();

        // Grant a one-time unlimited allowance so Aave can pull funds during supply.
        IERC20(TOKEN_IN).approve(address(AAVE), type(uint256).max);
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // 1. Compose Logic (`lzCompose`)
    //    Called by the LayerZero Endpoint after a user sends tokens cross-chain
    //    with a compose message. Decodes the message and performs a Aave V3 supply
    //    on behalf of the original sender.

    //    Steps:
    //      1. Authenticity checks (trusted Stargate Pool & Endpoint)
    //      2. Decode recipient address and amount from `_message`
    //      3. Try to execute supply on behalf of the recipient → emit `SupplyExecuted`
    //         • On failure, refund tokens → emit `SupplyFailedAndRefunded`
    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Consumes composed messages and supplies the received tokens into the Aave V3 pool.
    * @dev  `_message` is encoded by the OFT.send() caller on the source chain via
     *       `OFTComposeMsgCodec.encode()` and has the following layout:
     *
     *       ```
     *       | srcNonce (uint64) | srcEid (uint32) | amountLD (uint128) |
     *       | composeFrom (bytes32) | composeMsg (bytes) |
     *       ```
     *
     *       `composeMsg` (last field) is expected to be:
     *       `abi.encode(address onBehalfOf)`.
     *
     *
     * @param _oft     Address of the originating OFT; must equal the trusted `stargate`.
     * @dev _guid    Message hash (unused, but kept for future extensibility).
     * @param _message ABI-encoded compose payload containing recipient address.
     * @dev _executor Executor that relayed the message (unused).
     * @dev _extraData Extra data from executor (unused).
     */
    function lzCompose(
        address _oft,
        bytes32 /* _guid */,
        bytes calldata _message,
        address /* _executor */,
        bytes calldata /* _extraData */
    ) external payable {
        // Step 1️: Authenticate call logic source.
        if (_oft != STARGATE) revert UnauthorizedStargatePool();
        if (msg.sender != ENDPOINT) revert UnauthorizedEndpoint();

        // Step 2️: Decode the recipient address and amount from the message.
        (address _to) = abi.decode(OFTComposeMsgCodec.composeMsg(_message), (address));
        uint256 amountLD = OFTComposeMsgCodec.amountLD(_message);

        // Step 3: Execute the supply or refund to target recipient.
        try AAVE.supply(TOKEN_IN, amountLD, _to, 0) {  // 0 is the referral code
            emit SupplyExecuted(_to, amountLD);
        } catch {
            IERC20(TOKEN_IN).safeTransfer(_to, amountLD);
            emit SupplyFailedAndRefunded(_to, amountLD);
        }
    }
}
