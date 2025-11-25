// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { OFTUpgradeable } from "@layerzerolabs/oft-evm-upgradeable/contracts/oft/OFTUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import { SendParam, MessagingFee, MessagingReceipt, OFTReceipt } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppOptionsType3.sol";

/**
 * @title MyOFTUpgradeable
 * @dev Example OFT implementation with full security features
 * @dev ADAPTED FOR: Storage-based endpoint + No constructor pattern + Security controls
 */
contract MyOFTUpgradeable is OwnableUpgradeable, ERC20Upgradeable, PausableUpgradeable, OFTUpgradeable {
    /// @dev No constructor - pure initializer pattern
    constructor() {
        _disableInitializers();
    }

    /// @dev Initializes OFT with name, symbol, endpoint, delegate, and security features
    function initialize(string memory _name, string memory _symbol, address _lzEndpoint, address _delegate)
        public
        initializer
    {
        __ERC20_init(_name, _symbol);
        __Ownable_init(_delegate);
        __Pausable_init();
        __OFT_init(_lzEndpoint, _delegate);
    }

    // ========================================
    // PAUSABLE CONTROLS
    // ========================================

    /// @dev Pauses all token transfers and OFT operations
    function pause() external onlyOwner {
        _pause();
    }

    /// @dev Unpauses all token transfers and OFT operations
    function unpause() external onlyOwner {
        _unpause();
    }

    // ========================================
    // SECURITY-ENHANCED OVERRIDES
    // ========================================

    /// @dev Override _send to add pause check
    function _send(SendParam calldata _sendParam, MessagingFee calldata _fee, address _refundAddress)
        internal
        override
        whenNotPaused
        returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt)
    {
        // Other checks
        return super._send(_sendParam, _fee, _refundAddress);
    }

    /// @dev Override _debit to add pause check
    function _debit(address _from, uint256 _amountLD, uint256 _minAmountLD, uint32 _dstEid)
        internal
        override
        whenNotPaused
        returns (uint256 amountSentLD, uint256 amountReceivedLD)
    {
        // Other checks
        return super._debit(_from, _amountLD, _minAmountLD, _dstEid);
    }

    /// @dev Override _credit to add pause check
    function _credit(address _to, uint256 _amountLD, uint32 _srcEid)
        internal
        override
        whenNotPaused
        returns (uint256 amountReceivedLD)
    {
        // Other checks
        return super._credit(_to, _amountLD, _srcEid);
    }

    // ========================================
    // ACCESS-CONTROLLED ADMIN FUNCTIONS
    // ========================================

    /// @dev Sets peer with owner access control
    function setPeer(uint32 _eid, bytes32 _peer) public override onlyRole(DEFAULT_ADMIN_ROLE) {
        super.setPeer(_eid, _peer);
    }

    /// @dev Sets delegate with owner access control
    function setDelegate(address _delegate) public override onlyRole(DEFAULT_ADMIN_ROLE) {
        super.setDelegate(_delegate);
    }

    /// @dev Sets message inspector with owner access control
    function setMsgInspector(address _msgInspector) public override onlyRole(DEFAULT_ADMIN_ROLE) {
        super.setMsgInspector(_msgInspector);
    }

    /// @dev Sets enforced options with owner access control
    function setEnforcedOptions(EnforcedOptionParam[] calldata _enforcedOptions) public virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
        super.setEnforcedOptions(_enforcedOptions);
    }

    // ========================================
    // ERC20 FUNCTION OVERRIDES (Resolve Conflicts)
    // ========================================
    // Note: _checkAuthSingle is inherited directly from TokenBase (no override needed)

    /**
     * @notice Returns the decimals of the token
     * @dev Resolves conflict: SolmateERC20Upgradeable (via TokenBase) vs OFTUpgradeable
     */
    function decimals() public view override(SolmateERC20Upgradeable, OFTUpgradeable) returns (uint8) {
        return SolmateERC20Upgradeable.decimals();
    }

    /**
     * @notice Mints tokens (internal)
     * @dev Resolves conflict: SolmateERC20Upgradeable (via TokenBase) vs OFTUpgradeable
     */
    function _mint(address to, uint256 amount) internal override(SolmateERC20Upgradeable, OFTUpgradeable) {
        SolmateERC20Upgradeable._mint(to, amount);
    }

    /**
     * @notice Burns tokens (internal)
     * @dev Resolves conflict: SolmateERC20Upgradeable vs OFTUpgradeable
     */
    function _burn(address from, uint256 amount) internal override(SolmateERC20Upgradeable, OFTUpgradeable) {
        SolmateERC20Upgradeable._burn(from, amount);
    }
}
