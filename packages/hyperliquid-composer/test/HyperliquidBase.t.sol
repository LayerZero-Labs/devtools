// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Test, console } from "forge-std/Test.sol";

import { HyperLiquidComposerCodec } from "../contracts/library/HyperLiquidComposerCodec.sol";

import { IHyperLiquidComposer, IHyperAsset } from "../contracts/interfaces/IHyperLiquidComposer.sol";

import { HyperLiquidComposer } from "../contracts/HyperLiquidComposer.sol";

import { SpotBalancePrecompileMock } from "./mocks/SpotBalancePrecompileMock.sol";
import { CoreUserExistsMock } from "./mocks/CoreUserExistsMock.sol";
import { OFTMock } from "./mocks/OFTMock.sol";

import { TypeConversionTest } from "./ComposerCodec/TypeConversion.t.sol";

contract HyperliquidBaseTest is Test {
    IHyperAsset public ERC20;
    IHyperAsset public HYPE;
    OFTMock public oft;

    HyperLiquidComposer public hyperLiquidComposer;
    TypeConversionTest public typeConversionTest;

    address public constant HLP_CORE_WRITER = 0x3333333333333333333333333333333333333333;
    address public constant HLP_PRECOMPILE_READ_SPOT_BALANCE = 0x0000000000000000000000000000000000000801;
    address public constant HLP_PRECOMPILE_READ_USER_EXISTS = 0x0000000000000000000000000000000000000810;

    address public constant HL_LZ_ENDPOINT_V2_TESTNET = 0xf9e1815F151024bDE4B7C10BAC10e8Ba9F6b53E1;
    address public constant HL_LZ_ENDPOINT_V2_MAINNET = 0x3A73033C0b1407574C76BdBAc67f126f6b4a9AA9;

    struct Eids {
        uint32 ethEid;
        uint32 hlpEid;
    }
    struct CoreSpot {
        uint64 erc20;
        uint64 hype;
    }

    uint64 public AMOUNT_TO_SEND = 1 ether;
    uint64 public AMOUNT_TO_FUND = 0.001 ether;

    mapping(uint256 => Eids) public eidFromChainId;
    mapping(uint256 => CoreSpot) public coreSpotFromChainId;

    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");
    address public recovery = makeAddr("recovery");

    uint32 public ETH_EID;
    uint32 public HLP_EID;
    address public HL_LZ_ENDPOINT_V2;

    function setUp() public virtual {
        eidFromChainId[998] = Eids({ ethEid: 40161, hlpEid: 40362 });
        eidFromChainId[999] = Eids({ ethEid: 30301, hlpEid: 30367 });

        // ETH as ERC20 and HYPE as HYPE
        coreSpotFromChainId[998] = CoreSpot({ erc20: 1242, hype: 1105 });
        coreSpotFromChainId[999] = CoreSpot({ erc20: 221, hype: 150 });

        // Hyperliquid testnet has rate limits that return empty storage roots before a fork fails
        // It is therefore recommended to create a local anvil fork of hyperliquid and assign RPC_URL_HYPERLIQUID to anvil fork
        if (block.chainid != 998 && block.chainid != 999) {
            string memory rpcUrl = vm.envString("RPC_URL_HYPERLIQUID");
            // Skip test if fork fails
            try vm.createSelectFork(rpcUrl) {} catch {
                console.log("Forking mainnet ", rpcUrl, " failed");
                vm.skip(true);
            }
        }

        vm.etch(HLP_PRECOMPILE_READ_SPOT_BALANCE, address(new SpotBalancePrecompileMock()).code);
        vm.etch(HLP_PRECOMPILE_READ_USER_EXISTS, address(new CoreUserExistsMock()).code);

        HL_LZ_ENDPOINT_V2 = block.chainid == 998 ? HL_LZ_ENDPOINT_V2_TESTNET : HL_LZ_ENDPOINT_V2_MAINNET;

        ETH_EID = eidFromChainId[block.chainid].ethEid;
        HLP_EID = eidFromChainId[block.chainid].hlpEid;

        uint64 erc20CoreIndexId = coreSpotFromChainId[block.chainid].erc20;
        uint64 hypeCoreIndexId = coreSpotFromChainId[block.chainid].hype;

        ERC20 = IHyperAsset({
            assetBridgeAddress: HyperLiquidComposerCodec.into_assetBridgeAddress(erc20CoreIndexId),
            coreIndexId: erc20CoreIndexId,
            decimalDiff: 18 - 8
        });

        HYPE = IHyperAsset({
            assetBridgeAddress: 0x2222222222222222222222222222222222222222,
            coreIndexId: hypeCoreIndexId,
            decimalDiff: 18 - 10
        });

        oft = new OFTMock("test", "test", HL_LZ_ENDPOINT_V2, msg.sender);
        hyperLiquidComposer = new HyperLiquidComposer(address(oft), ERC20.coreIndexId, ERC20.decimalDiff);
        typeConversionTest = new TypeConversionTest();

        SpotBalancePrecompileMock(HLP_PRECOMPILE_READ_SPOT_BALANCE).setSpotBalance(
            ERC20.assetBridgeAddress,
            ERC20.coreIndexId,
            type(uint64).max
        );

        SpotBalancePrecompileMock(HLP_PRECOMPILE_READ_SPOT_BALANCE).setSpotBalance(
            HYPE.assetBridgeAddress,
            HYPE.coreIndexId,
            type(uint64).max
        );

        CoreUserExistsMock(HLP_PRECOMPILE_READ_USER_EXISTS).setUserExists(userA, true);
        CoreUserExistsMock(HLP_PRECOMPILE_READ_USER_EXISTS).setUserExists(userB, true);

        vm.deal(HL_LZ_ENDPOINT_V2, 100 ether);
    }
}
