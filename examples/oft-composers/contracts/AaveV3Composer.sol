// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { OFTComposeMsgCodec } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/libs/OFTComposeMsgCodec.sol";
import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { ILayerZeroComposer } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroComposer.sol";
import { IStargateEndpoint } from "./interfaces/IStargateEndpoint.sol";

import { IAaveV3Composer } from "./interfaces/IAaveV3Composer.sol";
import { IAaveV3Pool } from "./interfaces/IAaveV3Pool.sol";


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
    IAaveV3Pool public immutable AAVE;

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
    constructor(address _aavePool, address _stargatePool) {
        if (_aavePool == address(0)) revert InvalidAavePool();
        if (_stargatePool == address(0)) revert InvalidStargatePool();

        // Initialize the Aave pool.
        AAVE = IAaveV3Pool(_aavePool);

        // Initialize the Stargate Pool.
        STARGATE = _stargatePool;

        // Gran the endpoint from the StargatePool.
        ENDPOINT = address(IStargateEndpoint(_stargatePool).endpoint());

        // Grab the underlying token from the StargatePool.
        TOKEN_IN = IOFT(_stargatePool).token();

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
     * @param _sender     Address of the stargate contract; must equal the trusted `stargate`.
     * @dev _guid    Message hash (unused, but kept for future extensibility).
     * @param _message ABI-encoded compose payload containing recipient address.
     * @dev _executor Executor that relayed the message (unused).
     * @dev _extraData Extra data from executor (unused).
     */
    function lzCompose(
        address _sender,
        bytes32 _guid,
        bytes calldata _message,
        address /* _executor */,
        bytes calldata /* _extraData */
    ) external payable {
        // Authenticate call logic source.
        if (_sender != STARGATE) revert OnlyValidComposerCaller(_sender);
        if (msg.sender != ENDPOINT) revert OnlyEndpoint(msg.sender);

        // Decode the amount in local decimals and the compose message from the message.
        uint256 amountLD = OFTComposeMsgCodec.amountLD(_message);

        // Try to decompose the message, refund if it fails.
        try this.handleCompose{ value: msg.value }(_message, amountLD) {
            emit Sent(_guid);
        } catch {
            _refund(STARGATE, _message, amountLD, tx.origin, msg.value);
            emit Refunded(_guid);
        }
    }

    /**
     * @notice Handles the compose operation for OFT (Omnichain Fungible Token) transactions
     * @dev This function can only be called by the contract itself (self-call restriction)
     *      Decodes the compose message to extract SendParam and minimum message value
     * @param _message The original message that was sent
     * @param _amountLD The amount of tokens to supply
     */
    function handleCompose(bytes calldata _message, uint256 _amountLD) external payable {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        address _to = abi.decode(OFTComposeMsgCodec.composeMsg(_message), (address));

        // Try to execute the supply or refund to target recipient.
        try AAVE.supply(TOKEN_IN, _amountLD, _to, 0) {
            emit Supplied(_to, _amountLD);
        } catch {
            _refund(STARGATE, _message, _amountLD, tx.origin, msg.value);
            emit SupplyFailedAndRefunded(_to, _amountLD);
        }
    }

    /**
     * @dev Internal function to refund input tokens to sender on source during a failed transaction
     * @param _stargate The OFT contract address used for refunding
     * @param _message The original message that was sent
     * @param _amount The amount of tokens to refund
     * @param _refundAddress Address to receive the refund
     * @param _msgValue The amount of native tokens sent with the transaction
     */
     function _refund(
        address _stargate,
        bytes calldata _message,
        uint256 _amount,
        address _refundAddress,
        uint256 _msgValue
    ) internal virtual {
        SendParam memory refundSendParam;
        refundSendParam.dstEid = OFTComposeMsgCodec.srcEid(_message);
        refundSendParam.to = OFTComposeMsgCodec.composeFrom(_message);
        refundSendParam.amountLD = _amount;

        IOFT(_stargate).send{ value: _msgValue }(refundSendParam, MessagingFee({ nativeFee: _msgValue, lzTokenFee: 0 }), _refundAddress);
    }
}
