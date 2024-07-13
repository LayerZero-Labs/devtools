// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { EndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/EndpointV2.sol";
import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";
import { IOAppCore } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/interfaces/IOAppCore.sol";

import { OFTFeeMock } from "./mocks/OFTFeeMock.sol";
import { OFTFeeAdapterMock } from "./mocks/OFTFeeAdapterMock.sol";
import { ERC20Mock } from "./mocks/ERC20Mock.sol";
import { OFTInspectorMock } from "./mocks/OFTInspectorMock.sol";

import { TestHelper } from "./TestHelper.sol";
import { IOFT, MessagingFee, MessagingReceipt, OFTReceipt, SendParam } from "../contracts/interfaces/IOFT.sol";
import { IFee } from "../contracts/interfaces/IFee.sol";
import { OFT } from "../contracts/OFT.sol";
import { OFTAdapter } from "../contracts/OFTAdapter.sol";
import { OFTFee } from "../contracts/OFTFee.sol";

import { OFTComposerMock } from "./mocks/OFTComposerMock.sol";
import { OFTComposeMsgCodec } from "../contracts/libs/OFTComposeMsgCodec.sol";
import { OFTMockCodec } from "./lib/OFTMockCodec.sol";
import { OFTAdapterMockCodec } from "./lib/OFTAdapterMockCodec.sol";
import { OFTTest } from "./OFT.t.sol";

// @dev Extends the OFTTest suite;  every OFT test should also pass for Fee implementations, albeit with any needed
// modifications for fees.
contract OFTFeeTest is OFTTest {
    using OptionsBuilder for bytes;
    using OFTMockCodec for OFT;
    using OFTAdapterMockCodec for OFTAdapter;

    // @dev defaultFeeBps for overridden tests that are not fuzzed
    uint16 internal constant DEFAULT_FEE_BPS = 123;

    function setUp() public virtual override {
        // 1. deal out some ether to the users
        _deal();

        // 2. deploy the endpoints
        setUpEndpoints(3, LibraryType.UltraLightNode);

        // 3. deploy the OFTs and OFTAdapter
        aOFT = OFTFeeMock(
            _deployOApp(
                type(OFTFeeMock).creationCode, // @dev note that this is the Fee variant
                abi.encode(A_OFT_NAME, A_OFT_SYMBOL, address(endpoints[A_EID]), address(this))
            )
        );

        bOFT = OFTFeeMock(
            _deployOApp(
                type(OFTFeeMock).creationCode,
                abi.encode(B_OFT_NAME, B_OFT_SYMBOL, address(endpoints[B_EID]), address(this))
            )
        );

        cERC20Mock = new ERC20Mock(C_TOKEN_NAME, C_TOKEN_SYMBOL);
        cOFTAdapter = OFTFeeAdapterMock(
            _deployOApp(
                type(OFTFeeAdapterMock).creationCode,
                abi.encode(address(cERC20Mock), address(endpoints[C_EID]), address(this))
            )
        );

        // 4. config and wire the ofts
        address[] memory ofts = new address[](3);
        ofts[0] = address(aOFT);
        ofts[1] = address(bOFT);
        ofts[2] = address(cOFTAdapter);
        this.wireOApps(ofts);

        // 5. mint OFT and ERC-20 tokens
        aOFT.asOFTFeeMock().mint(userA, initialBalance);
        bOFT.asOFTFeeMock().mint(userB, initialBalance);
        cERC20Mock.mint(userC, initialBalance);

        // 6. deploy a universal inspector, can be used by each oft
        oAppInspector = new OFTInspectorMock();
    }

    function _assumeDelegate(address _delegate) internal pure {
        vm.assume(_delegate != address(0));
    }

    function test_constructor(string memory _name, string memory _symbol, address _delegate) public {
        _assumeDelegate(_delegate);

        OFTFee oft = new OFTFeeMock(_name, _symbol, address(endpoints[A_EID]), _delegate);
        assertEq(oft.name(), _name);
        assertEq(oft.symbol(), _symbol);
        assertEq(address(oft.endpoint()), address(endpoints[A_EID]));
        assertEq(EndpointV2(endpoints[A_EID]).delegates(address(oft)), _delegate);
    }

    function test_constructor_InvalidDelegate(string memory _name, string memory _symbol) public {
        vm.expectRevert(IOAppCore.InvalidDelegate.selector);
        new OFTFeeMock(_name, _symbol, address(endpoints[A_EID]), address(0));
    }

    function test_setDefaultFeeBps(address _user, uint16 _feeBps) public {
        // 1. Assume a non-privileged user
        vm.assume(_user != address(this));
        OFTFeeMock oftFeeMock = aOFT.asOFTFeeMock();

        // 2. Attempt to set the default fee with non-owner, ensure it reverts
        vm.prank(_user);
        vm.expectRevert("Ownable: caller is not the owner");
        oftFeeMock.setDefaultFeeBps(_feeBps);

        // 3. caller is address(this), the owner
        // 4. Attempt to set the default fee with owner, ensure it succeeds or fails depending on _feeBps value
        if (_feeBps >= aOFT.asOFTFeeMock().BPS_DENOMINATOR()) {
            vm.expectRevert(IFee.InvalidBps.selector);
            oftFeeMock.setDefaultFeeBps(_feeBps);
        } else {
            oftFeeMock.setDefaultFeeBps(_feeBps);
            assertEq(oftFeeMock.defaultFeeBps(), _feeBps);
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // @dev overridden from OFTTest to support Fee use case
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // @notice Test debiting an OFT from userA on A_EID destined to B_EID.
    // @dev overridden because balance expectations are different for Fee implementations
    function test_oft_debit() public virtual override {
        // 1. Set up the test, expecting a reasonable slippage that won't throw.
        uint16 bpsDenominator = aOFT.asOFTFeeMock().BPS_DENOMINATOR();
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = (amountToSendLD * (bpsDenominator - aOFT.asOFTFeeMock().defaultFeeBps() - 50)) /
            bpsDenominator;
        uint32 dstEid = B_EID;
        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(aOFT.balanceOf(address(this)), 0);

        // 2. Debit the OFT, expecting no revert
        vm.startPrank(userA);
        aOFT.asIERC20().approve(address(aOFT), amountToSendLD);
        (uint256 amountDebitedLD, uint256 amountToCreditLD) = aOFT.asOFTMock().debit(
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
            aOFT.asOFTFeeMock().removeDust(amountToSendLD * (bpsDenominator - aOFT.asOFTFeeMock().defaultFeeBps())) /
                bpsDenominator
        );

        // 4. Assert userA's aOFT balance decreased accordingly, and the contract's aOFT balance increased by just the
        // fee, as the credit should be burned.
        assertEq(aOFT.balanceOf(userA), initialBalance - amountDebitedLD);
        assertEq(aOFT.balanceOf(address(this)), 0);
        assertEq(aOFT.balanceOf(address(aOFT)), expectedFeeLD);

        // 5. Withdraw the fee to the feeReceiver, and verify the balances match expectations.
        address feeReceiver = makeAddr("feeReceiver");
        vm.assume(aOFT.balanceOf(feeReceiver) == 0);
        aOFT.asOFTFeeMock().withdrawFees(feeReceiver);
        assertEq(aOFT.balanceOf(feeReceiver), expectedFeeLD);
    }

    // @dev Overridden because the Slippage error message is slightly different for the Fee implementation.
    function test_debit_slippage_minAmountToCreditLD() public virtual override {
        uint16 bpsDenominator = aOFT.asOFTFeeMock().BPS_DENOMINATOR();
        aOFT.asOFTFeeMock().setDefaultFeeBps(DEFAULT_FEE_BPS);

        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1.00000001 ether;
        uint32 dstEid = A_EID;

        vm.expectRevert(
            abi.encodeWithSelector(
                IOFT.SlippageExceeded.selector,
                (amountToSendLD * (bpsDenominator - aOFT.asOFTFeeMock().defaultFeeBps())) / bpsDenominator,
                minAmountToCreditLD
            )
        );
        aOFT.asOFTFeeMock().debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    // @dev Overridden because the SlippageExceeded error values are slightly different for the Fee implementation.
    function test_debit_slippage_removeDust() public virtual override {
        // 1. Set up some default fee bps, no dstEid specific ones
        uint16 bpsDenominator = aOFT.asOFTFeeMock().BPS_DENOMINATOR();
        aOFT.asOFTFeeMock().setDefaultFeeBps(DEFAULT_FEE_BPS);

        // 2. amountToSendLD is contrived to lose precision when converted to shared decimals
        uint256 amountToSendLD = 1.23456789 ether;
        uint256 minAmountToCreditLD = 1.23456789 ether;
        uint32 dstEid = A_EID;

        // 3. remove the dust form the shared decimal conversion
        assertEq(aOFT.asOFTFeeMock().removeDust(amountToSendLD), 1.234567 ether);

        // 4. Expect a SlippageExceeded revert, as the minAmountToCreditLD is too high after truncating the dust
        vm.expectRevert(
            abi.encodeWithSelector(
                IOFT.SlippageExceeded.selector,
                aOFT.asOFTFeeMock().removeDust((amountToSendLD * (bpsDenominator - DEFAULT_FEE_BPS)) / bpsDenominator),
                minAmountToCreditLD
            )
        );
        aOFT.asOFTMock().debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    // @dev Elaborates on test_debit_slippage_removeDust with some more realistic fee-specific fuzzing.
    function test_debit_slippage_removeDust_fuzz(
        uint16 _defaultFeeBps,
        uint16 _aFeeBps,
        bool _aFeeBpsEnabled,
        uint8 _dstEidSeed
    ) public virtual {
        // 1. Set up defaultFeeBps, A_EID-specific bps that may or may not be enabled, and a contrived dstEidSeed that
        // is reduced to A_EID or B_EID.
        uint16 bpsDenominator = aOFT.asOFTFeeMock().BPS_DENOMINATOR();
        vm.assume(_defaultFeeBps < bpsDenominator);
        vm.assume(_aFeeBps < bpsDenominator);
        aOFT.asOFTFeeMock().setDefaultFeeBps(_defaultFeeBps);
        uint32 dstEid = (_dstEidSeed % 2) + 1; // A_EID or B_EID
        aOFT.asOFTFeeMock().setFeeBps(A_EID, _aFeeBps, _aFeeBpsEnabled);

        // 2. amountToSendLD is contrived to lose precision when converted to shared decimals
        uint256 amountToSendLD = 1.23456789 ether;
        uint256 minAmountToCreditLD = 1.23456789 ether;

        // 3. remove the dust form the shared decimal conversion (redundant but quick)
        assertEq(aOFT.asOFTFeeMock().removeDust(amountToSendLD), 1.234567 ether);

        // 4. Calculate expectedBps based on dstEid and whether A_EID-specific bps are enabled.
        uint16 expectedBps = dstEid == A_EID && _aFeeBpsEnabled ? _aFeeBps : _defaultFeeBps;

        // 5. Expect a SlippageExceeded revert, as the minAmountToCreditLD is too high after truncating the dust
        vm.expectRevert(
            abi.encodeWithSelector(
                IOFT.SlippageExceeded.selector,
                aOFT.asOFTFeeMock().removeDust((amountToSendLD * (bpsDenominator - expectedBps)) / bpsDenominator),
                minAmountToCreditLD
            )
        );
        aOFT.asOFTMock().debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    // @notice Test debiting the OFTAdapter on C_EID from userC to A_EID.
    // @dev Overridden because the debit values are slightly different for the Fee implementation.
    function test_oft_adapter_debit() public virtual override {
        // 1. Set up the test with DEFAULT_FEE_BPS, expecting an unreasonable Slippage that is sure to revert.
        uint16 bpsDenominator = cOFTAdapter.asOFTFeeAdapterMock().BPS_DENOMINATOR();
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1 ether;
        uint32 dstEid = A_EID;
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
        uint32 dstEid = A_EID;
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
        verifyPackets(A_EID, address(aOFT));
        uint256 expectedFee = amountDebitedLD - amountToCreditLD;

        // 3. Verify the correct amounts are transferred.
        assertEq(cERC20Mock.balanceOf(userC), initialBalance - amountDebitedLD);
        assertEq(cERC20Mock.balanceOf(address(cOFTAdapter)), amountDebitedLD);
        assertEq(cOFTAdapter.asOFTFeeAdapterMock().feeBalance(), expectedFee);

        // 4. Withdraw the fee to the feeReceiver, and verify the balances match expectations.
        cOFTAdapter.asOFTFeeAdapterMock().withdrawFees(feeReceiver);
        assertEq(cERC20Mock.balanceOf(feeReceiver), feeReceiverBalance + expectedFee);
        assertEq(cERC20Mock.balanceOf(address(cOFTAdapter)), amountDebitedLD - expectedFee);
    }
}
