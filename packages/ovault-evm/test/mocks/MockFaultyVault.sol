// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { IERC20, ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockFaultyVault
 * @notice A faulty ERC4626 vault implementation that simulates async behavior by giving 0 tokens
 * @dev This mock is designed to test slippage protection in vault operations
 *      - On deposit: Mints expected shares but transfers 0 tokens (async deposit)
 *      - On redeem: Burns shares but transfers 0 assets (async redeem)
 */
contract MockFaultyVault is ERC4626 {
    using SafeERC20 for IERC20;

    constructor(
        string memory _name,
        string memory _symbol,
        address _asset
    ) ERC4626(IERC20(_asset)) ERC20(_name, _symbol) {}

    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    /**
     * @notice Async deposit that gives 0 shares immediately (simulates async vault)
     * @dev Override deposit to transfer assets but mint 0 shares (async behavior)
     */
    function deposit(uint256 assets, address receiver) public virtual override returns (uint256 shares) {
        // Transfer full amount of assets from user
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);

        // Simulate async vault: return expected shares but mint 0
        shares = previewDeposit(assets);
        // _mint(receiver, shares); // Don't mint - async!

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    /**
     * @notice Async redeem that gives 0 assets immediately (simulates async vault)
     * @dev Override redeem to burn shares but transfer 0 assets (async behavior)
     */
    function redeem(uint256 shares, address receiver, address owner) public virtual override returns (uint256 assets) {
        // Calculate what we SHOULD give
        assets = previewRedeem(shares);

        // Burn the full amount of shares
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }
        _burn(owner, shares);

        // Simulate async vault: don't transfer assets
        // IERC20(asset()).safeTransfer(receiver, assets); // Don't transfer - async!

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    // Standard mint function for testing setup
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    // Standard burn function for testing setup
    function burn(address from, uint256 amount) public {
        _burn(from, amount);
    }
}
