// SPDX-LICENSE-IDENTIFIER: UNLICENSED

pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { TransparentUpgradeableProxy, ITransparentUpgradeableProxy } from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import { ProxyAdmin } from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import { ERC1967Utils } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import { Vm } from "forge-std/Vm.sol";
import { FeeUpgradeable } from "../contracts/oft/FeeUpgradeable.sol";
import { FeeConfig, IFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IFee.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract FeeUpgradeableImpl is FeeUpgradeable {
    function initialize(address _owner) public initializer {
        __Fee_init();
        __Ownable_init(_owner);
    }

    function getFeeBps(uint32 _dstEid) external view returns (uint16) {
        return _getFeeBps(_dstEid);
    }
}

contract FeeUpgradeableImplV2 is FeeUpgradeableImpl {
    bool public isNew;

    function initializeV2() reinitializer(2) public {
        __Fee_init();
        isNew = true;
    }
}

contract FeeUpgradeableTest is Test {
    address internal feeImplOwner = makeAddr("feeImplOwner");
    
    ProxyAdmin proxyAdmin;
    FeeUpgradeableImpl feeUpgradeableImpl;

    function setUp() public virtual {
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(new FeeUpgradeableImpl()),
            address(this),
            abi.encodeWithSelector(FeeUpgradeableImpl.initialize.selector, feeImplOwner)
        );
        proxyAdmin = ProxyAdmin(getProxyAdminAddress(address(proxy)));
        feeUpgradeableImpl = FeeUpgradeableImpl(address(proxy));
    }

    function getProxyAdminAddress(address proxy) internal view returns (address) {
        address CHEATCODE_ADDRESS = 0x7109709ECfa91a80626fF3989D68f67F5b1DD12D;
        Vm vm = Vm(CHEATCODE_ADDRESS);

        bytes32 adminSlot = vm.load(proxy, ERC1967Utils.ADMIN_SLOT);
        return address(uint160(uint256(adminSlot)));
    }

    function test_setDefaultFeeBps(uint16 _feeBps) public {
        if (_feeBps > feeUpgradeableImpl.BPS_DENOMINATOR()) {
            vm.expectRevert(IFee.InvalidBps.selector);
            vm.prank(feeImplOwner);
            feeUpgradeableImpl.setDefaultFeeBps(_feeBps);
        } else {
            vm.prank(feeImplOwner);
            feeUpgradeableImpl.setDefaultFeeBps(_feeBps);
            assertEq(feeUpgradeableImpl.defaultFeeBps(), _feeBps);
        }
    }

    function test_setFeeBps(uint16 _defaultFeeBps, uint32 _dstEid, uint16 _feeBps, bool _enabled) public {
        vm.assume(_defaultFeeBps < feeUpgradeableImpl.BPS_DENOMINATOR());
        vm.prank(feeImplOwner);
        feeUpgradeableImpl.setDefaultFeeBps(_defaultFeeBps);
        assertEq(feeUpgradeableImpl.defaultFeeBps(), _defaultFeeBps);

        if (_feeBps > feeUpgradeableImpl.BPS_DENOMINATOR()) {
            vm.prank(feeImplOwner);
            vm.expectRevert(IFee.InvalidBps.selector);
            feeUpgradeableImpl.setFeeBps(_dstEid, _feeBps, _enabled);
        } else {
            vm.prank(feeImplOwner);
            feeUpgradeableImpl.setFeeBps(_dstEid, _feeBps, _enabled);
            FeeConfig memory actualFeeConfig = feeUpgradeableImpl.feeBps(_dstEid);
            assertEq(actualFeeConfig.feeBps, _feeBps);
            assertEq(actualFeeConfig.enabled, _enabled);
            assertEq(feeUpgradeableImpl.getFeeBps(_dstEid), _enabled ? _feeBps : _defaultFeeBps);
        }
    }

    function test_upgrade_to_v2() public {
        // Set initial state
        vm.prank(feeImplOwner);
        feeUpgradeableImpl.setDefaultFeeBps(777);
        assertEq(feeUpgradeableImpl.defaultFeeBps(), 777);

        // Upgrade to V2
        proxyAdmin.upgradeAndCall(ITransparentUpgradeableProxy(address(feeUpgradeableImpl)), address(new FeeUpgradeableImplV2()), abi.encodeWithSelector(FeeUpgradeableImplV2.initializeV2.selector));

        // Verify state is preserved
        FeeUpgradeableImplV2 upgradedFeeImpl = FeeUpgradeableImplV2(address(feeUpgradeableImpl));
        assertEq(upgradedFeeImpl.defaultFeeBps(), 777);

        // Verify new property
        assertTrue(upgradedFeeImpl.isNew());
    }
}