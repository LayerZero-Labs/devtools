// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { OFTFeeAdapterMock } from "./mocks/OFTFeeAdapterMock.sol";
import { ERC20Mock } from "./mocks/ERC20Mock.sol";
import { OFTInspectorMock, IOAppMsgInspector } from "./mocks/OFTInspectorMock.sol";

import { IOFT, MessagingFee, MessagingReceipt, OFTReceipt, SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IFee.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";
import { OFTFeeUpgradeableMock } from "./mocks/OFTFeeUpgradeableMock.sol";

import { OFTComposerMock } from "@layerzerolabs/oft-evm/test/mocks/OFTComposerMock.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { OFTMockCodec } from "./lib/OFTMockCodec.sol";
import { OFTAdapterMockCodec } from "./lib/OFTAdapterMockCodec.sol";
import { OFTTest } from "./OFT.t.sol";

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { OFTUpgradeableMock } from "./mocks/OFTUpgradeableMock.sol";
import { MessagingFee, MessagingReceipt } from "../contracts/oft/OFTCoreUpgradeable.sol";
import { OFTAdapterUpgradeableMock } from "./mocks/OFTAdapterUpgradeableMock.sol";
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm-upgradeable/contracts/oapp/libs/OAppOptionsType3Upgradeable.sol";

import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IOFT, SendParam, OFTReceipt } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "forge-std/console.sol";
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";
import { TransparentUpgradeableProxy } from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

// @dev Pulling in EndpointV2 for lz-evm-protocol-v2 caused OZ dependency issues.
interface EndpointV2 {
    function delegates(address) external view returns (address);
}

// @dev Extends the OFTTest suite;  every OFT test should also pass for Fee implementations, albeit with any needed
// modifications for fees.
contract OFTFeeTest is OFTTest {
    using OptionsBuilder for bytes;
    using OFTMockCodec for OFTUpgradeableMock;
    using OFTAdapterMockCodec for OFTAdapterUpgradeableMock;

    // @dev defaultFeeBps for overridden tests that are not fuzzed
    uint16 internal constant DEFAULT_FEE_BPS = 123;

    function setUp() public virtual override {
        // 1. deal out some ether to the users
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);
        vm.deal(userC, 1000 ether);

        // 2. deploy the endpoints
        setUpEndpoints(3, LibraryType.UltraLightNode);

        // 3. deploy the OFTs and OFTAdapter
        aOFT = OFTUpgradeableMock(
            _deployContractAndProxy(
                type(OFTFeeUpgradeableMock).creationCode,
                abi.encode(address(endpoints[aEid])),
                abi.encodeWithSelector(OFTFeeUpgradeableMock.initialize.selector, "aOFT", "aOFT", address(this))
            )
        );

        bOFT = OFTUpgradeableMock(
            _deployContractAndProxy(
                type(OFTFeeUpgradeableMock).creationCode,
                abi.encode(address(endpoints[bEid])),
                abi.encodeWithSelector(OFTFeeUpgradeableMock.initialize.selector, "bOFT", "bOFT", address(this))
            )
        );

        cERC20Mock = new ERC20Mock("cToken", "cToken");
        cOFTAdapter = OFTAdapterUpgradeableMock(
            _deployContractAndProxy(
                type(OFTFeeAdapterMock).creationCode,
                abi.encode(address(cERC20Mock), address(endpoints[cEid])),
                abi.encodeWithSelector(OFTFeeAdapterMock.initialize.selector, address(this))
            )
        );

        // 4. config and wire the ofts
        address[] memory ofts = new address[](3);
        ofts[0] = address(aOFT);
        ofts[1] = address(bOFT);
        ofts[2] = address(cOFTAdapter);
        this.wireOApps(ofts);

        // 5. mint OFT and ERC-20 tokens
        aOFT.asOFTFeeUpgradeableMock().mint(userA, initialBalance);
        bOFT.asOFTFeeUpgradeableMock().mint(userB, initialBalance);
        cERC20Mock.mint(userC, initialBalance);

        // 6. deploy a universal inspector, can be used by each oft
        oAppInspector = new OFTInspectorMock();
    }

    function _assumeDelegate(address _delegate) internal pure {
        vm.assume(_delegate != address(0));
    }

    function test_setDefaultFeeBps() public {
        // 1. Assume a non-privileged user
        address _user = userA;
        OFTFeeUpgradeableMock oftFeeMock = aOFT.asOFTFeeUpgradeableMock();
        uint16 _feeBps = 222;

        // 2. Attempt to set the default fee with non-owner, ensure it reverts
        vm.prank(_user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, _user));
        oftFeeMock.setDefaultFeeBps(_feeBps);

        // 3. caller is address(this), the owner
        // 4. Attempt to set the default fee with owner, ensure it succeeds or fails depending on _feeBps value
        _feeBps = aOFT.asOFTFeeUpgradeableMock().BPS_DENOMINATOR() + 1;
       
        vm.expectRevert(IFee.InvalidBps.selector);
        oftFeeMock.setDefaultFeeBps(_feeBps);

        _feeBps = 777;
        oftFeeMock.setDefaultFeeBps(_feeBps);
        assertEq(oftFeeMock.defaultFeeBps(), _feeBps);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // @dev overridden from OFTTest to support Fee use case
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // @notice Test debiting an OFT from userA on aEid destined to bEid.
    // @dev overridden because balance expectations are different for Fee implementations
    function test_oft_debit() public virtual override {
        // 1. Set up the test, expecting a reasonable slippage that won't throw.
        aOFT.asOFTFeeUpgradeableMock().setDefaultFeeBps(DEFAULT_FEE_BPS);
        uint16 bpsDenominator = aOFT.asOFTFeeUpgradeableMock().BPS_DENOMINATOR();
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = (amountToSendLD * (bpsDenominator - aOFT.asOFTFeeUpgradeableMock().defaultFeeBps() - 50)) /
            bpsDenominator;

        uint32 dstEid = bEid;
        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(aOFT.balanceOf(address(this)), 0);

        // 2. Debit the OFT, expecting no revert
        vm.startPrank(userA);
        aOFT.asIERC20().approve(address(aOFT), amountToSendLD);
        (uint256 amountDebitedLD, uint256 amountToCreditLD) = aOFT.asOFTFeeUpgradeableMock().debit(
            amountToSendLD,
            minAmountToCreditLD,
            dstEid
        );
        vm.stopPrank();
        verifyPackets(dstEid, address(bOFT));

        // 3. Verify the results
        uint256 expectedFeeLD = amountDebitedLD - amountToCreditLD;
        assertEq(amountDebitedLD, amountToSendLD);
        assertEq(
            amountToCreditLD,
            aOFT.asOFTFeeUpgradeableMock().removeDust(amountToSendLD * (bpsDenominator - aOFT.asOFTFeeUpgradeableMock().defaultFeeBps())) /
                bpsDenominator
        );

        // 4. Assert userA's aOFT balance decreased accordingly, and the contract's aOFT balance increased by just the
        // fee, as the credit should be burned.
        assertEq(aOFT.balanceOf(userA), initialBalance - amountDebitedLD);
        assertEq(aOFT.balanceOf(address(this)), 0);
        assertEq(aOFT.balanceOf(address(aOFT)), expectedFeeLD);

        // 5. Withdraw the fee to the feeReceiver, and verify the balances match expectations.
        address feeReceiver = makeAddr("feeReceiver");
        aOFT.asOFTFeeUpgradeableMock().withdrawFees(feeReceiver);
        assertEq(aOFT.asIERC20().balanceOf(feeReceiver), expectedFeeLD);
    }

    // @dev Overridden because the Slippage error message is slightly different for the Fee implementation.
    function test_debit_slippage_minAmountToCreditLD() public virtual override {
        uint16 bpsDenominator = aOFT.asOFTFeeUpgradeableMock().BPS_DENOMINATOR();
        aOFT.asOFTFeeUpgradeableMock().setDefaultFeeBps(DEFAULT_FEE_BPS);

        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1.00000001 ether;
        uint32 dstEid = aEid;

        vm.expectRevert(
            abi.encodeWithSelector(
                IOFT.SlippageExceeded.selector,
                (amountToSendLD * (bpsDenominator - aOFT.asOFTFeeUpgradeableMock().defaultFeeBps())) / bpsDenominator,
                minAmountToCreditLD
            )
        );
        aOFT.asOFTFeeUpgradeableMock().debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    // @dev Overridden because the SlippageExceeded error values are slightly different for the Fee implementation.
    function test_debit_slippage_removeDust() public virtual override {
        // 1. Set up some default fee bps, no dstEid specific ones
        uint16 bpsDenominator = aOFT.asOFTFeeUpgradeableMock().BPS_DENOMINATOR();
        aOFT.asOFTFeeUpgradeableMock().setDefaultFeeBps(DEFAULT_FEE_BPS);

        // 2. amountToSendLD is contrived to lose precision when converted to shared decimals
        uint256 amountToSendLD = 1.23456789 ether;
        uint256 minAmountToCreditLD = 1.23456789 ether;
        uint32 dstEid = aEid;

        // 3. remove the dust form the shared decimal conversion
        assertEq(aOFT.asOFTFeeUpgradeableMock().removeDust(amountToSendLD), 1.234567 ether);

        // 4. Expect a SlippageExceeded revert, as the minAmountToCreditLD is too high after truncating the dust
        vm.expectRevert(
            abi.encodeWithSelector(
                IOFT.SlippageExceeded.selector,
                aOFT.asOFTFeeUpgradeableMock().removeDust((amountToSendLD * (bpsDenominator - DEFAULT_FEE_BPS)) / bpsDenominator),
                minAmountToCreditLD
            )
        );
        aOFT.asOFTFeeUpgradeableMock().debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    // @dev Elaborates on test_debit_slippage_removeDust with some more realistic fee-specific fuzzing.
    function test_debit_slippage_removeDust_fuzz(
        uint16 _defaultFeeBps,
        uint16 _aFeeBps,
        bool _aFeeBpsEnabled,
        uint8 _dstEidSeed
    ) public virtual {
        // 1. Set up defaultFeeBps, aEid-specific bps that may or may not be enabled, and a contrived dstEidSeed that
        // is reduced to aEid or bEid.
        uint16 bpsDenominator = aOFT.asOFTFeeUpgradeableMock().BPS_DENOMINATOR();
        vm.assume(_defaultFeeBps < bpsDenominator);
        vm.assume(_aFeeBps < bpsDenominator);
        aOFT.asOFTFeeUpgradeableMock().setDefaultFeeBps(_defaultFeeBps);
        uint32 dstEid = (_dstEidSeed % 2) + 1; // aEid or bEid
        aOFT.asOFTFeeUpgradeableMock().setFeeBps(aEid, _aFeeBps, _aFeeBpsEnabled);

        // 2. amountToSendLD is contrived to lose precision when converted to shared decimals
        uint256 amountToSendLD = 1.23456789 ether;
        uint256 minAmountToCreditLD = 1.23456789 ether;

        // 3. remove the dust form the shared decimal conversion (redundant but quick)
        assertEq(aOFT.asOFTFeeUpgradeableMock().removeDust(amountToSendLD), 1.234567 ether);

        // 4. Calculate expectedBps based on dstEid and whether aEid-specific bps are enabled.
        uint16 expectedBps = dstEid == aEid && _aFeeBpsEnabled ? _aFeeBps : _defaultFeeBps;

        // 5. Expect a SlippageExceeded revert, as the minAmountToCreditLD is too high after truncating the dust
        vm.expectRevert(
            abi.encodeWithSelector(
                IOFT.SlippageExceeded.selector,
                aOFT.asOFTFeeUpgradeableMock().removeDust((amountToSendLD * (bpsDenominator - expectedBps)) / bpsDenominator),
                minAmountToCreditLD
            )
        );
        aOFT.asOFTFeeUpgradeableMock().debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    // @notice Test debiting the OFTAdapter on cEid from userC to aEid.
    // @dev Overridden because the debit values are slightly different for the Fee implementation.
    function test_oft_adapter_debit() public virtual override {
        // 1. Set up the test with DEFAULT_FEE_BPS, expecting an unreasonable Slippage that is sure to revert.
        uint16 bpsDenominator = cOFTAdapter.asOFTFeeAdapterMock().BPS_DENOMINATOR();
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1 ether;
        uint32 dstEid = aEid;
        cOFTAdapter.asOFTFeeAdapterMock().setDefaultFeeBps(DEFAULT_FEE_BPS);

        assertEq(cERC20Mock.balanceOf(userC), initialBalance);
        assertEq(cERC20Mock.balanceOf(address(cOFTAdapter)), 0);

        // 2. Call debitView on the OFTFeeAdapter, expecting a revert due to SlippageExceeded
        vm.prank(userC);
        vm.expectRevert(
            abi.encodeWithSelector(
                IOFT.SlippageExceeded.selector,
                cOFTAdapter.asOFTFeeAdapterMock().removeDust(
                    (amountToSendLD * (bpsDenominator - cOFTAdapter.asOFTFeeAdapterMock().defaultFeeBps())) /
                        bpsDenominator
                ),
                minAmountToCreditLD + 1
            )
        );
        cOFTAdapter.asOFTAdapterMock().debitView(amountToSendLD, minAmountToCreditLD + 1, dstEid);

        // 3. Debit with no Slippage expectations.
        vm.prank(userC);
        cERC20Mock.approve(address(cOFTAdapter), amountToSendLD);
        vm.prank(userC);
        (uint256 amountDebitedLD, uint256 amountToCreditLD) = cOFTAdapter.asOFTFeeAdapterMock().debit(
            amountToSendLD,
            0,
            dstEid
        );
        verifyPackets(dstEid, address(aOFT));

        // 4. Verify the correct amounts are transferred.
        uint256 expectedFee = amountDebitedLD - amountToCreditLD;

        assertEq(cERC20Mock.balanceOf(userC), initialBalance - amountToSendLD);
        assertEq(cERC20Mock.balanceOf(address(cOFTAdapter)), amountToSendLD);
        assertEq(cOFTAdapter.asOFTFeeAdapterMock().feeBalance(), expectedFee);

        // 5. Withdraw the fee to the feeReceiver, and verify the balances match expectations.
        address feeReceiver = makeAddr("feeReceiver");
        vm.assume(cERC20Mock.balanceOf(feeReceiver) == 0); // ensure the feeReceiver has no balance
        cOFTAdapter.asOFTFeeAdapterMock().withdrawFees(feeReceiver);
        assertEq(cERC20Mock.balanceOf(feeReceiver), expectedFee); // ensure the feeReceiver has received the fees
        assertEq(cERC20Mock.balanceOf(address(cOFTAdapter)), amountToSendLD - expectedFee); // adapter has the remainder
    }

    function test_oft_adapter_debit_fuzz(uint64 _amountToSendLD, uint16 _defaultFeeBps, uint16 _feeBps) public virtual {
        // 1. Assume a reasonable amount to send and fee values
        uint16 bpsDenominator = cOFTAdapter.asOFTFeeAdapterMock().BPS_DENOMINATOR();
        vm.assume(_amountToSendLD > 1e13 && _amountToSendLD < 100 ether);
        vm.assume(_defaultFeeBps < bpsDenominator);
        vm.assume(_feeBps < bpsDenominator);
        uint32 dstEid = aEid;
        cOFTAdapter.asOFTFeeAdapterMock().setDefaultFeeBps(_defaultFeeBps);
        cOFTAdapter.asOFTFeeAdapterMock().setFeeBps(dstEid, _feeBps, true);

        assertEq(cERC20Mock.balanceOf(userC), initialBalance);
        assertEq(cERC20Mock.balanceOf(address(cOFTAdapter)), 0);

        address feeReceiver = makeAddr("feeReceiver");
        uint256 feeReceiverBalance = cERC20Mock.balanceOf(feeReceiver);

        uint256 minAmountToCreditLD = 0;

        // 2. Debit the OFTAdapter, expecting no revert.
        vm.prank(userC);
        cERC20Mock.approve(address(cOFTAdapter), _amountToSendLD);
        vm.prank(userC);
        (uint256 amountDebitedLD, uint256 amountToCreditLD) = cOFTAdapter.asOFTAdapterMock().debit(
            _amountToSendLD,
            minAmountToCreditLD,
            dstEid
        );
        verifyPackets(aEid, address(aOFT));
        uint256 expectedFee = amountDebitedLD - amountToCreditLD;

        // 3. Verify the correct amounts are transferred.
        assertEq(cERC20Mock.balanceOf(userC), initialBalance - amountDebitedLD);
        assertEq(cERC20Mock.balanceOf(address(cOFTAdapter)), amountDebitedLD);
        assertEq(cOFTAdapter.asOFTFeeAdapterMock().feeBalance(), expectedFee);

        // 4. Withdraw the fee to the feeReceiver, and verify the balances match expectations.
        if (expectedFee > 0) {
            cOFTAdapter.asOFTFeeAdapterMock().withdrawFees(feeReceiver);
            assertEq(cERC20Mock.balanceOf(feeReceiver), feeReceiverBalance + expectedFee);
            assertEq(cERC20Mock.balanceOf(address(cOFTAdapter)), amountDebitedLD - expectedFee);
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // @dev Override native adapter tests to skip them in OFTFeeTest (fee tests don't need native adapter functionality)
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function test_constructor() public virtual override {
        assertEq(aOFT.owner(), address(this));
        assertEq(bOFT.owner(), address(this));
        assertEq(cOFTAdapter.owner(), address(this));

        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(bOFT.balanceOf(userB), initialBalance);
        assertEq(IERC20(cOFTAdapter.token()).balanceOf(userC), initialBalance);

        assertEq(aOFT.token(), address(aOFT));
        assertEq(bOFT.token(), address(bOFT));
        assertEq(cOFTAdapter.token(), address(cERC20Mock));

        // Skip native adapter assertions in fee test suite
    }

    function test_native_oft_adapter_debit() public virtual override {
        // Skip native adapter tests in fee test suite
        vm.skip(true);
    }

    function test_native_oft_adapter_credit() public virtual override {
        // Skip native adapter tests in fee test suite
        vm.skip(true);
    }

    function test_native_oft_adapter_send() public virtual override {
        // Skip native adapter tests in fee test suite
        vm.skip(true);
    }

    function test_native_oft_adapter_send_compose_msg() public virtual override {
        // Skip native adapter tests in fee test suite
        vm.skip(true);
    }
}