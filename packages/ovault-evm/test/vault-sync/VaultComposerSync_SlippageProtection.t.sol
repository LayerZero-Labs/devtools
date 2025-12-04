// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { IVaultComposerSync } from "../../contracts/interfaces/IVaultComposerSync.sol";
import { VaultComposerSync } from "../../contracts/VaultComposerSync.sol";
import { VaultComposerSyncBaseTest } from "./VaultComposerSync_Base.t.sol";

import { MockFaultyVault } from "../mocks/MockFaultyVault.sol";
import { MockOFTAdapter } from "../mocks/MockOFT.sol";

/**
 * @title VaultComposerSync Async Slippage Protection Tests
 * @notice Tests to verify vault composer correctly handles async vault operations that give 0 tokens immediately
 * @dev Uses MockFaultyVault that simulates async vault behavior by not transferring tokens immediately
 */
contract VaultComposerSyncSlippageProtectionTest is VaultComposerSyncBaseTest {
    using OptionsBuilder for bytes;

    MockFaultyVault public faultyVault;
    MockOFTAdapter public faultyShareOFT;
    VaultComposerSync public faultyVaultComposer;

    function _getUndustedAssetAmount(uint256 _amount) internal pure virtual returns (uint256) {
        (uint256 sentUndusted, ) = _removeDust(_amount);
        return sentUndusted;
    }

    function setUp() public virtual override {
        super.setUp();

        // Create faulty vault using the existing asset token from the base mesh
        faultyVault = new MockFaultyVault("Faulty Vault Share", "FVS", address(assetToken_arb));

        // Create share OFT adapter for the faulty vault on ARB
        faultyShareOFT = new MockOFTAdapter(address(faultyVault), address(endpoints[ARB_EID]), address(this));

        // Wire share OFT peers to existing mesh (ETH, POL)
        faultyShareOFT.setPeer(ETH_EID, addressToBytes32(address(shareOFT_eth)));
        faultyShareOFT.setPeer(POL_EID, addressToBytes32(address(shareOFT_pol)));

        // Create vault composer with faulty vault, reusing the asset OFT from base
        faultyVaultComposer = new VaultComposerSync(
            address(faultyVault),
            address(assetOFT_arb),
            address(faultyShareOFT)
        );

        // Bootstrap the vault properly for ERC4626 math (1:1 asset:share ratio)
        assetToken_arb.mint(address(faultyVault), 1000 ether); // Assets in faulty vault
        faultyVault.mint(address(this), 1000 ether); // Matching shares (1:1 ratio)
    }

    /**
     * @notice Test depositAndSend reverts when received shares are under minAmountLD slippage protection
     * @dev Faulty vault gives 0 shares immediately (async), balance check should catch this
     */
    function test_depositAndSend_Revert_UnderSlippage() public {
        uint256 assetAmount = 1000 ether;
        uint256 expectedShares = faultyVault.previewDeposit(assetAmount); // 1000 shares expected

        // Fund user and approve
        assetToken_arb.mint(userA, assetAmount);
        vm.prank(userA);
        IERC20(address(assetToken_arb)).approve(address(faultyVaultComposer), assetAmount);

        // User sets minAmountLD = 100% of expected shares (1000)
        // But faulty vault gives 0 shares immediately (async behavior)
        SendParam memory sendParam = SendParam({
            dstEid: POL_EID,
            to: addressToBytes32(userB),
            amountLD: 0, // Will be set to actual received shares
            minAmountLD: expectedShares, // Require 100% (1000 shares)
            extraOptions: OptionsBuilder.newOptions().addExecutorLzReceiveOption(200_000, 0),
            composeMsg: "",
            oftCmd: ""
        });

        // Should revert because actual received (0) < minAmountLD (1000)
        vm.expectRevert(
            abi.encodeWithSelector(
                IVaultComposerSync.SlippageExceeded.selector,
                0, // actual shares received (async - none immediately)
                1000 ether // minAmountLD required
            )
        );

        vm.prank(userA);
        faultyVaultComposer.depositAndSend{ value: 1 ether }(assetAmount, sendParam, userA);
    }

    /**
     * @notice Test depositAndSend succeeds when minAmountLD is set to zero (accepts async vault behavior)
     * @dev User sets minAmountLD = 0, accepting async behavior where tokens come later
     */
    function test_depositAndSend_Succeed_ZeroSlippage() public {
        uint256 assetAmount = 1000 ether;

        // Fund user and approve
        assetToken_arb.mint(userA, assetAmount);
        vm.prank(userA);
        IERC20(address(assetToken_arb)).approve(address(faultyVaultComposer), assetAmount);

        // User sets minAmountLD = 0, accepting async vault behavior
        // Faulty vault gives 0 shares immediately, which meets minAmountLD = 0
        SendParam memory sendParam = SendParam({
            dstEid: POL_EID,
            to: addressToBytes32(userB),
            amountLD: 0, // Will be set to actual received shares
            minAmountLD: 0, // Accept async behavior (tokens come later)
            extraOptions: OptionsBuilder.newOptions().addExecutorLzReceiveOption(200_000, 0),
            composeMsg: "",
            oftCmd: ""
        });

        // Should succeed: actual received (0) >= minAmountLD (0)
        vm.prank(userA);
        faultyVaultComposer.depositAndSend{ value: 1 ether }(assetAmount, sendParam, userA);
    }

    /**
     * @notice Test redeemAndSend reverts when received assets are under minAmountLD slippage protection
     * @dev Faulty vault gives 0 assets immediately (async), balance check should catch this
     */
    function test_redeemAndSend_Revert_UnderSlippage() public {
        uint256 shareAmount = 1000 ether;

        // Mint shares to user (1:1 ratio with initial bootstrap)
        faultyVault.mint(userA, shareAmount);

        // Approve composer to spend shares
        vm.prank(userA);
        IERC20(address(faultyVault)).approve(address(faultyVaultComposer), shareAmount);

        // Expected assets = shares (1:1 ratio from bootstrap)
        uint256 expectedAssets = shareAmount;

        // User sets minAmountLD = 100% of expected assets (1000)
        // But faulty vault gives 0 assets immediately (async behavior)
        SendParam memory sendParam = SendParam({
            dstEid: ETH_EID,
            to: addressToBytes32(userB),
            amountLD: 0, // Will be set to actual received assets
            minAmountLD: expectedAssets, // Require 100% (1000 assets)
            extraOptions: OptionsBuilder.newOptions().addExecutorLzReceiveOption(200_000, 0),
            composeMsg: "",
            oftCmd: ""
        });

        // Should revert because actual received (0) < minAmountLD (1000)
        vm.expectRevert(
            abi.encodeWithSelector(
                IVaultComposerSync.SlippageExceeded.selector,
                0, // actual assets received (async - none immediately)
                1000 ether // minAmountLD required
            )
        );

        vm.prank(userA);
        faultyVaultComposer.redeemAndSend{ value: 1 ether }(shareAmount, sendParam, userA);
    }

    /**
     * @notice Test redeemAndSend succeeds when minAmountLD is set to zero (accepts async vault behavior)
     * @dev User sets minAmountLD = 0, accepting async behavior where tokens come later
     */
    function test_redeemAndSend_Succeed_ZeroSlippage() public {
        uint256 shareAmount = 1000 ether;

        // Mint shares to user (1:1 ratio with initial bootstrap)
        faultyVault.mint(userA, shareAmount);

        // Approve composer to spend shares
        vm.prank(userA);
        IERC20(address(faultyVault)).approve(address(faultyVaultComposer), shareAmount);

        // User sets minAmountLD = 0, accepting async vault behavior
        // Faulty vault gives 0 assets immediately, which meets minAmountLD = 0
        SendParam memory sendParam = SendParam({
            dstEid: ETH_EID,
            to: addressToBytes32(userB),
            amountLD: 0, // Will be set to actual received assets
            minAmountLD: 0, // Accept async behavior (tokens come later)
            extraOptions: OptionsBuilder.newOptions().addExecutorLzReceiveOption(200_000, 0),
            composeMsg: "",
            oftCmd: ""
        });

        // Should succeed: actual received (0) >= minAmountLD (0)
        vm.prank(userA);
        faultyVaultComposer.redeemAndSend{ value: 1 ether }(shareAmount, sendParam, userA);
    }
}
