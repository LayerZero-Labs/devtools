// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {OFTCore} from "@layerzerolabs/oft-evm/contracts/OFTCore.sol";
import {SendParam, MessagingFee, MessagingReceipt, OFTReceipt} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import {IAuthManager} from "../../authmanager/interfaces/IAuthManager.sol";

/**
 * @title ShareOFT
 * @notice OFT representation of Token shares on spoke chains (e.g., Ethereum)
 * @dev Burns/mints token representation on spoke chains, corresponding to locked shares on hub
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * IMPLEMENTATION DECISION: Why OFTCore Instead of OFT?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LayerZero provides OFT as a higher-level abstraction, but we inherit from
 * OFTCore + ERC20 directly for the following reasons:
 *
 * 1. **OpenZeppelin Version Incompatibility**:
 *    - LayerZero's OFT contract was built for OpenZeppelin 4.x
 *    - Our project uses OpenZeppelin 5.x (required by other dependencies)
 *    - OpenZeppelin 5.x introduced breaking changes in Ownable constructor
 *    - Mixing versions causes compilation errors in inheritance chain
 *
 * 2. **OFTCore is Version-Stable**:
 *    - OFTCore (the base) works across OpenZeppelin versions
 *    - It provides all core LayerZero messaging logic (~90% of the code)
 *    - Only thin OFT logic (burn/mint) needs to be implemented
 *
 * 3. **Transparency for Auditing**:
 *    - Burn/mint logic is ~10 lines of straightforward code
 *    - Easier to audit than debugging version conflicts
 *    - Clear separation: LayerZero handles messaging, we handle tokens
 *
 * 4. **No Functional Loss**:
 *    - OFT is just a thin wrapper over OFTCore + ERC20
 *    - Our implementation has identical functionality
 *    - We still achieve ~90% LayerZero code reuse
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAYERZERO CODE REUSE: ~90%
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ✅ LAYERZERO (via OFTCore):
 * - All messaging logic (send, quote, compose, etc.)
 * - Fee calculation and estimation
 * - Cross-chain communication protocol
 * - Event emission and error handling
 * - Endpoint interaction
 *
 * ➕ CUSTOM (~10% - ~20 lines):
 * - Burn logic (_debit: _burn)
 * - Mint logic (_credit: _mint with 0x0 → 0xdead)
 * - Auth checks (Ban + Sanction ONLY - NO KYC for transfers)
 * - ERC20 token functionality (via OpenZeppelin ERC20)
 * - token() and approvalRequired() implementations
 * - 6 decimal override
 *
 * This is equivalent to LayerZero's OFT with auth checks added.
 *
 * Architecture:
 * - Hub (Avalanche): ShareOFTAdapter locks actual token
 * - Spoke (Ethereum): ShareOFT mints/burns representation
 * - Total supply on Ethereum = Locked amount on Avalanche
 *
 * Note: Ownable is inherited via OFTCore → OApp → Ownable chain
 */
contract ShareOFT is OFTCore, ERC20 {
    /// @notice AuthManager for KYC/ban checks
    IAuthManager public authManager;

    /// @notice Emitted when AuthManager is updated
    event AuthManagerUpdated(address indexed oldAuthManager, address indexed newAuthManager);

    /**
     * @notice Constructor for ShareOFT
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _lzEndpoint LayerZero endpoint address
     * @param _delegate Delegate/owner for LayerZero configurations
     * @param _authManager AuthManager address for KYC/ban/sanction checks (address(0) to skip)
     */
    constructor(string memory _name, string memory _symbol, address _lzEndpoint, address _delegate, address _authManager)
        ERC20(_name, _symbol)
        OFTCore(decimals(), _lzEndpoint, _delegate)
        Ownable(_delegate)
    {
        // Note: Explicitly initialize Ownable for OpenZeppelin 5.x compatibility
        // LayerZero's OAppCore was built for OZ 4.x which didn't require this
        
        if (_authManager != address(0)) {
            authManager = IAuthManager(_authManager);
            emit AuthManagerUpdated(address(0), _authManager);
        }
    }

    /**
     * @notice Get token decimals
     * @return 6
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @dev Get the token address (this contract)
     */
    function token() public view override returns (address) {
        return address(this);
    }

    /**
     * @notice Approval is not required for OFT (contract is the token itself)
     */
    function approvalRequired() external pure override returns (bool) {
        return false;
    }

    /**
     * @notice Set the AuthManager address
     * @param _authManager New AuthManager address
     */
    function setAuthManager(address _authManager) external onlyOwner {
        emit AuthManagerUpdated(address(authManager), _authManager);
        authManager = IAuthManager(_authManager);
    }

    /**
     * @dev Override send to check both sender and receiver on source chain
     * @dev Defense in depth: Check both parties before transfer, then recheck receiver on destination
     * @dev Implements LayerZero's OFTCore.send() logic with auth checks added
     */
    function send(SendParam calldata _sendParam, MessagingFee calldata _fee, address _refundAddress)
        external
        payable
        virtual
        override
        returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt)
    {
        // ➕ CUSTOM: Check BOTH sender and receiver on source chain (same network)
        // AuthManager is synced across chains, so we catch issues early
        // This prevents banned/sanctioned users from initiating or receiving transfers
        _checkRestrictionsDual(msg.sender, _sendParam.to);

        // ✅ LAYERZERO: Replicate OFTCore.send() logic
        // Applies the token transfers regarding this send() operation
        (uint256 amountSentLD, uint256 amountReceivedLD) = _debit(
            msg.sender,
            _sendParam.amountLD,
            _sendParam.minAmountLD,
            _sendParam.dstEid
        );

        // Builds the options and OFT message to quote in the endpoint
        (bytes memory message, bytes memory options) = _buildMsgAndOptions(_sendParam, amountReceivedLD);

        // Sends the message to the LayerZero endpoint
        msgReceipt = _lzSend(_sendParam.dstEid, message, options, _fee, _refundAddress);

        // Formulate the OFT receipt
        oftReceipt = OFTReceipt(amountSentLD, amountReceivedLD);

        emit OFTSent(msgReceipt.guid, _sendParam.dstEid, msg.sender, amountSentLD, amountReceivedLD);
    }

    /**
     * @dev Debit tokens (burn from sender)
     * @dev Implements LayerZero's OFT burn pattern
     * @dev Note: Sender already checked in send(), no need to recheck here
     */
    function _debit(address _from, uint256 _amountLD, uint256 _minAmountLD, uint32 _dstEid)
        internal
        virtual
        override
        returns (uint256 amountSentLD, uint256 amountReceivedLD)
    {
        // ✅ LAYERZERO: Standard OFT burn pattern
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);
        _burn(_from, amountSentLD);
    }

    /**
     * @dev Credit tokens (mint to recipient)
     * @dev Implements LayerZero's OFT mint pattern with auth checks
     * @dev IMPORTANT: Rechecks receiver on destination chain (status might have changed during transit)
     */
    function _credit(address _to, uint256 _amountLD, uint32 _srcEid) internal virtual override returns (uint256) {
        // ➕ CUSTOM: Recheck receiver on destination chain
        // Status might have changed during cross-chain transfer
        _checkRestrictions(_to);

        // ✅ LAYERZERO: Standard OFT mint pattern (0x0 → 0xdead)
        if (_to == address(0x0)) _to = address(0xdead);
        _mint(_to, _amountLD);
        return _amountLD;
    }

    /**
     * @dev Check restrictions for BOTH sender and receiver (Ban + Sanction only, NO KYC)
     * @param _sender Sender address
     * @param _receiver Receiver address (bytes32 format from SendParam)
     * @dev Called on SOURCE chain to check both parties before transfer
     * @dev AuthManager is synced across chains, so checks are consistent
     */
    function _checkRestrictionsDual(address _sender, bytes32 _receiver) internal view {
        if (address(authManager) == address(0)) return;

        // Check sender
        if (_sender != address(0) && _sender != address(0xdead)) {
            authManager.checkSanctioned(_sender);
            authManager.checkBanned(_sender);
        }

        // Check receiver (convert from bytes32)
        address receiver = address(uint160(uint256(_receiver)));
        if (receiver != address(0) && receiver != address(0xdead)) {
            authManager.checkSanctioned(receiver);
            authManager.checkBanned(receiver);
        }
    }

    /**
     * @dev Check restrictions for single address (Ban + Sanction only, NO KYC)
     * @param account Address to check ban/sanction status for
     * @dev Called on DESTINATION chain to recheck receiver
     * @dev Mirrors TokenBase._checkRestrictions() pattern:
     *      - Transfer operations only check Ban + Sanction
     *      - Vault operations (deposit/withdraw) check KYC + Ban + Sanction
     *      - Cross-chain transfers are transfer operations, not vault operations
     */
    function _checkRestrictions(address account) internal view {
        if (address(authManager) != address(0) && account != address(0xdead)) {
            authManager.checkSanctioned(account); // Check sanction status
            authManager.checkBanned(account);     // Check ban status
            // NOTE: NO KYC check - transfers don't require KYC, only vault operations do
        }
    }
}
