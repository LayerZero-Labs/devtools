// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

// Forge
import { Test } from "forge-std/Test.sol";
import "forge-std/console.sol";

// Oz
import { DoubleEndedQueue } from "@openzeppelin/contracts/utils/structs/DoubleEndedQueue.sol";

// Msg Lib
import { UlnConfig, SetDefaultUlnConfigParam } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";
import { SetDefaultExecutorConfigParam, ExecutorConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/SendLibBase.sol";
import { SetDefaultReadLibConfigParam, ReadLibConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/readlib/ReadLibBase.sol";
import { BitMap256 } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/libs/SupportedCmdTypes.sol";
import { ExecutorOptions } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/libs/ExecutorOptions.sol";

// Protocol
import { IMessageLib } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLib.sol";
import { ISendLib, Packet } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ISendLib.sol";
import { PacketV1Codec } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/PacketV1Codec.sol";
import { Origin, ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

// @dev oz4/5 breaking change...
import { ReceiveUln302Mock as ReceiveUln302, IReceiveUlnE2 } from "./mocks/ReceiveUln302Mock.sol";
import { DVNMock as DVN, ExecuteParam, IDVN } from "./mocks/DVNMock.sol";
import { DVNFeeLibMock as DVNFeeLib } from "./mocks/DVNFeeLibMock.sol";
import { ExecutorMock as Executor, IExecutor } from "./mocks/ExecutorMock.sol";
import { PriceFeedMock as PriceFeed, ILayerZeroPriceFeed } from "./mocks/PriceFeedMock.sol";
import { EndpointV2Mock as EndpointV2 } from "./mocks/EndpointV2Mock.sol";
import { EndpointV2AltMock as EndpointV2Alt } from "./mocks/EndpointV2AltMock.sol";
import { ReadLib1002Mock as ReadLib1002 } from "./mocks/ReadLib1002Mock.sol";

// Misc. Mocks
import { OptionsHelper } from "./OptionsHelper.sol";
import { SendUln302Mock as SendUln302 } from "./mocks/SendUln302Mock.sol";
import { SimpleMessageLibMock } from "./mocks/SimpleMessageLibMock.sol";
import { ExecutorFeeLibMock as ExecutorFeeLib } from "./mocks/ExecutorFeeLibMock.sol";

interface IOAppSetPeer {
    function setPeer(uint32 _eid, bytes32 _peer) external;
    function endpoint() external view returns (ILayerZeroEndpointV2 iEndpoint);
}

interface IOAppSetReadChannel {
    function setReadChannel(uint32 _channelId, bool _active) external;
    function endpoint() external view returns (ILayerZeroEndpointV2 iEndpoint);
}

/**
 * @title TestHelperOz5
 * @notice Helper contract for setting up and managing LayerZero test environments.
 * @dev Extends Foundry's Test contract and provides utility functions for setting up mock endpoints and OApps.
 */
contract TestHelperOz5 is Test, OptionsHelper {
    enum LibraryType {
        UltraLightNode,
        SimpleMessageLib
    }

    struct EndpointSetup {
        EndpointV2[] endpointList;
        uint32[] eidList;
        address[] sendLibs;
        address[] receiveLibs;
        address[] readLibs;
        address[] signers;
        PriceFeed[] priceFeed;
    }

    struct LibrarySetup {
        SendUln302 sendUln;
        ReceiveUln302 receiveUln;
        ReadLib1002 readUln;
        Executor executor;
        DVN dvn;
        ExecutorFeeLib executorLib;
        DVNFeeLib dvnLib;
    }

    struct ConfigParams {
        IExecutor.DstConfigParam[] executorConfigParams;
        IDVN.DstConfigParam[] dvnConfigParams;
        DVNFeeLib.SetSupportedCmdTypesParam[] dvnFeeLibConfigParams;
    }

    using DoubleEndedQueue for DoubleEndedQueue.Bytes32Deque;
    using PacketV1Codec for bytes;

    mapping(uint32 => mapping(bytes32 => DoubleEndedQueue.Bytes32Deque)) packetsQueue; // dstEid => dstUA => guids queue
    mapping(bytes32 => bytes) packets; // guid => packet bytes
    mapping(bytes32 => bytes) optionsLookup; // guid => options

    mapping(uint32 => address) endpoints; // eid => endpoint
    mapping(uint32 => uint256) eidForkMap; // eid => fork id

    uint256 public constant TREASURY_GAS_CAP = 1000000000000;
    uint256 public constant TREASURY_GAS_FOR_FEE_CAP = 100000;
    uint128 public constant NATIVE_TOKEN_PRICE_USD = 1e20; // 1 USD
    uint120 public constant EVM_REQUEST_FEE_USD = 1e18;
    uint120 public constant EVM_COMPUTE_REDUCE_FEE_USD = 1e18;
    uint16 public constant EVM_COMPUTE_MAP_BPS = 10000;
    uint256 public constant MAP_REDUCE_COMPUTE_TYPES = 3;
    uint32 public constant DEFAULT_CHANNEL_ID = 70001;

    uint128 public executorValueCap = 0.1 ether;

    EndpointSetup internal endpointSetup;
    LibrarySetup internal libSetup;

    /// @dev Initializes test environment setup, to be overridden by specific tests.
    function setUp() public virtual {
        _setUpUlnOptions();
    }

    /**
     * @dev set executorValueCap if more than 0.1 ether is necessary
     * @dev this must be called prior to setUpEndpoints() if the value is to be used
     * @param _valueCap amount executor can pass as msg.value to lzReceive()
     */
    function setExecutorValueCap(uint128 _valueCap) public {
        executorValueCap = _valueCap;
    }

    function setUpEndpoints(uint8 _endpointNum, LibraryType _libraryType) public {
        createEndpoints(_endpointNum, _libraryType, new address[](_endpointNum), new string[](_endpointNum));
    }

    /**
     * @notice Sets up endpoints for testing.
     * @param _endpointNum The number of endpoints to create.
     * @param _libraryType The type of message library to use (UltraLightNode or SimpleMessageLib).
     */
    function createEndpoints(
        uint8 _endpointNum,
        LibraryType _libraryType,
        address[] memory nativeTokenAddresses
    ) public {
        createEndpoints(_endpointNum, _libraryType, nativeTokenAddresses, new string[](_endpointNum));
    }

    function createEndpoints(
        uint8 _endpointNum,
        LibraryType _libraryType,
        address[] memory nativeTokenAddresses,
        string[] memory forkUrls
    ) public {
        endpointSetup.endpointList = new EndpointV2[](_endpointNum);
        endpointSetup.eidList = new uint32[](_endpointNum);
        endpointSetup.sendLibs = new address[](_endpointNum);
        endpointSetup.receiveLibs = new address[](_endpointNum);
        endpointSetup.readLibs = new address[](_endpointNum);
        endpointSetup.priceFeed = new PriceFeed[](_endpointNum);
        endpointSetup.signers = new address[](1);
        endpointSetup.signers[0] = vm.addr(1);

        {
            uint256 forkId = 0;
            // create fork ids
            for (uint8 i = 0; i < _endpointNum; i++) {
                if (bytes(forkUrls[i]).length > 0) {
                    forkId = vm.createFork(forkUrls[i]);
                }

                uint32 eid = i + 1;
                eidForkMap[eid] = forkId;
            }

            // deploy endpoints
            for (uint8 i = 0; i < _endpointNum; i++) {
                uint32 eid = i + 1;
                vm.selectFork(eidForkMap[eid]);

                endpointSetup.eidList[i] = eid;

                address nativeToken = nativeTokenAddresses[i];

                if (nativeToken == address(0)) {
                    endpointSetup.endpointList[i] = new EndpointV2(eid, address(this));
                } else {
                    endpointSetup.endpointList[i] = new EndpointV2Alt(eid, address(this), nativeToken);
                }
                registerEndpoint(endpointSetup.endpointList[i]);
            }
        }

        for (uint8 i = 0; i < _endpointNum; i++) {
            uint32 eid = i + 1;
            vm.selectFork(eidForkMap[eid]);

            // @dev oz4/5 breaking change... constructor init
            endpointSetup.priceFeed[i] = new PriceFeed(address(this));

            if (_libraryType == LibraryType.UltraLightNode) {
                address endpointAddr = address(endpointSetup.endpointList[i]);

                libSetup.sendUln = new SendUln302(
                    payable(this),
                    endpointAddr,
                    TREASURY_GAS_CAP,
                    TREASURY_GAS_FOR_FEE_CAP
                );
                libSetup.receiveUln = new ReceiveUln302(endpointAddr);
                libSetup.readUln = new ReadLib1002(
                    payable(this),
                    endpointAddr,
                    TREASURY_GAS_CAP,
                    TREASURY_GAS_FOR_FEE_CAP
                );
                endpointSetup.endpointList[i].registerLibrary(address(libSetup.sendUln));
                endpointSetup.endpointList[i].registerLibrary(address(libSetup.receiveUln));
                endpointSetup.endpointList[i].registerLibrary(address(libSetup.readUln));
                endpointSetup.sendLibs[i] = address(libSetup.sendUln);
                endpointSetup.receiveLibs[i] = address(libSetup.receiveUln);
                endpointSetup.readLibs[i] = address(libSetup.readUln);

                {
                    address[] memory admins = new address[](1);
                    admins[0] = address(this);

                    address[] memory messageLibs = new address[](3);
                    messageLibs[0] = address(libSetup.sendUln);
                    messageLibs[1] = address(libSetup.receiveUln);
                    messageLibs[2] = address(libSetup.readUln);

                    libSetup.executor = new Executor(
                        endpointAddr,
                        address(0x0),
                        messageLibs,
                        address(endpointSetup.priceFeed[i]),
                        address(this),
                        admins
                    );

                    libSetup.executorLib = new ExecutorFeeLib(endpointSetup.eidList[i]);
                    libSetup.executor.setWorkerFeeLib(address(libSetup.executorLib));

                    libSetup.dvn = new DVN(
                        endpointSetup.eidList[i],
                        i + 1,
                        messageLibs,
                        address(endpointSetup.priceFeed[i]),
                        endpointSetup.signers,
                        1,
                        admins
                    );
                    libSetup.dvnLib = new DVNFeeLib(endpointSetup.eidList[i], 1e18);
                    libSetup.dvnLib.setCmdFees(EVM_REQUEST_FEE_USD, EVM_COMPUTE_REDUCE_FEE_USD, EVM_COMPUTE_MAP_BPS);
                    libSetup.dvn.setWorkerFeeLib(address(libSetup.dvnLib));
                }

                ConfigParams memory configParams;
                configParams.executorConfigParams = new IExecutor.DstConfigParam[](_endpointNum + 1);
                configParams.dvnConfigParams = new IDVN.DstConfigParam[](_endpointNum + 1);
                configParams.dvnFeeLibConfigParams = new DVNFeeLib.SetSupportedCmdTypesParam[](_endpointNum + 1);

                address[] memory defaultDVNs = new address[](1);
                address[] memory optionalDVNs = new address[](0);
                defaultDVNs[0] = address(libSetup.dvn);

                for (uint8 j = 0; j < _endpointNum; j++) {
                    if (i == j) continue;
                    uint32 dstEid = j + 1;

                    SetDefaultUlnConfigParam[] memory ulnParams = new SetDefaultUlnConfigParam[](1);
                    UlnConfig memory ulnConfig = UlnConfig(
                        100,
                        uint8(defaultDVNs.length),
                        uint8(optionalDVNs.length),
                        0,
                        defaultDVNs,
                        optionalDVNs
                    );

                    {
                        ulnParams[0] = SetDefaultUlnConfigParam(dstEid, ulnConfig);
                        libSetup.sendUln.setDefaultUlnConfigs(ulnParams);
                        libSetup.receiveUln.setDefaultUlnConfigs(ulnParams);
                    }

                    {
                        SetDefaultExecutorConfigParam[] memory execParams = new SetDefaultExecutorConfigParam[](1);
                        ExecutorConfig memory execConfig = ExecutorConfig(10000, address(libSetup.executor));
                        execParams[0] = SetDefaultExecutorConfigParam(dstEid, execConfig);
                        libSetup.sendUln.setDefaultExecutorConfigs(execParams);
                    }

                    // executor config
                    configParams.executorConfigParams[j] = IExecutor.DstConfigParam({
                        dstEid: dstEid,
                        lzReceiveBaseGas: 5000,
                        lzComposeBaseGas: 5000,
                        multiplierBps: 10000,
                        floorMarginUSD: 1e10,
                        nativeCap: executorValueCap
                    });

                    // dvn config
                    configParams.dvnConfigParams[j] = IDVN.DstConfigParam({
                        dstEid: dstEid,
                        gas: 5000,
                        multiplierBps: 10000,
                        floorMarginUSD: 1e10
                    });

                    // dvn fee lib config
                    configParams.dvnFeeLibConfigParams[j] = DVNFeeLib.SetSupportedCmdTypesParam({
                        targetEid: dstEid,
                        types: BitMap256.wrap(MAP_REDUCE_COMPUTE_TYPES)
                    });

                    uint128 denominator = endpointSetup.priceFeed[i].getPriceRatioDenominator();
                    ILayerZeroPriceFeed.UpdatePrice[] memory prices = new ILayerZeroPriceFeed.UpdatePrice[](1);
                    prices[0] = ILayerZeroPriceFeed.UpdatePrice(
                        dstEid,
                        ILayerZeroPriceFeed.Price(1 * denominator, 1, 1)
                    );
                    endpointSetup.priceFeed[i].setPrice(prices);
                    endpointSetup.priceFeed[i].setNativeTokenPriceUSD(NATIVE_TOKEN_PRICE_USD);
                }

                {
                    // Read configs
                    {
                        SetDefaultReadLibConfigParam[] memory readUlnParams = new SetDefaultReadLibConfigParam[](1);
                        ReadLibConfig memory readUlnConfig = ReadLibConfig(
                            address(libSetup.executor),
                            uint8(defaultDVNs.length),
                            uint8(optionalDVNs.length),
                            0,
                            defaultDVNs,
                            optionalDVNs
                        );
                        readUlnParams[0] = SetDefaultReadLibConfigParam(DEFAULT_CHANNEL_ID, readUlnConfig);
                        libSetup.readUln.setDefaultReadLibConfigs(readUlnParams);
                    }

                    {
                        configParams.executorConfigParams[_endpointNum] = IExecutor.DstConfigParam({
                            dstEid: endpointSetup.eidList[i],
                            lzReceiveBaseGas: 5000,
                            lzComposeBaseGas: 5000,
                            multiplierBps: 10000,
                            floorMarginUSD: 1e10,
                            nativeCap: executorValueCap
                        });

                        configParams.dvnConfigParams[_endpointNum] = IDVN.DstConfigParam({
                            dstEid: endpointSetup.eidList[i],
                            gas: 5000,
                            multiplierBps: 10000,
                            floorMarginUSD: 1e10
                        });

                        configParams.dvnFeeLibConfigParams[_endpointNum] = DVNFeeLib.SetSupportedCmdTypesParam({
                            targetEid: endpointSetup.eidList[i],
                            types: BitMap256.wrap(MAP_REDUCE_COMPUTE_TYPES)
                        });
                    }
                }

                libSetup.executor.setDstConfig(configParams.executorConfigParams);
                libSetup.dvn.setDstConfig(configParams.dvnConfigParams);
                libSetup.dvnLib.setSupportedCmdTypes(configParams.dvnFeeLibConfigParams);
            } else if (_libraryType == LibraryType.SimpleMessageLib) {
                SimpleMessageLibMock messageLib = new SimpleMessageLibMock(
                    payable(this),
                    address(endpointSetup.endpointList[i])
                );
                endpointSetup.endpointList[i].registerLibrary(address(messageLib));
                endpointSetup.sendLibs[i] = address(messageLib);
                endpointSetup.receiveLibs[i] = address(messageLib);
            } else {
                revert("invalid library type");
            }
        }

        // config up
        for (uint8 i = 0; i < _endpointNum; i++) {
            uint32 eid = i + 1;
            vm.selectFork(eidForkMap[eid]);

            EndpointV2 endpoint = endpointSetup.endpointList[i];
            if (_libraryType == LibraryType.UltraLightNode) {
                endpoint.setDefaultSendLibrary(DEFAULT_CHANNEL_ID, endpointSetup.readLibs[i]);
                endpoint.setDefaultReceiveLibrary(DEFAULT_CHANNEL_ID, endpointSetup.readLibs[i], 0);
            }
            for (uint8 j = 0; j < _endpointNum; j++) {
                if (i == j) continue;
                endpoint.setDefaultSendLibrary(j + 1, endpointSetup.sendLibs[i]);
                endpoint.setDefaultReceiveLibrary(j + 1, endpointSetup.receiveLibs[i], 0);
            }
        }
    }

    /**
     * @notice Sets up mock OApp contracts for testing.
     * @param _oappCreationCode The bytecode for creating OApp contracts.
     * @param _startEid The starting endpoint ID for OApp setup.
     * @param _oappNum The number of OApps to set up.
     * @return oapps An array of addresses for the deployed OApps.
     */
    function setupOApps(
        bytes memory _oappCreationCode,
        uint8 _startEid,
        uint8 _oappNum
    ) public returns (address[] memory oapps) {
        oapps = new address[](_oappNum);
        for (uint8 eid = _startEid; eid < _startEid + _oappNum; eid++) {
            vm.selectFork(eidForkMap[eid]);

            address oapp = _deployOApp(_oappCreationCode, abi.encode(address(endpoints[eid]), address(this), true));
            oapps[eid - _startEid] = oapp;
        }
        // config
        wireOApps(oapps);
    }

    /**
     * @notice Configures the peers between multiple OApp instances.
     * @dev Sets each OApp as a peer to every other OApp in the provided array, except itself.
     * @param oapps An array of addresses representing the deployed OApp instances.
     */
    function wireOApps(address[] memory oapps) public {
        uint256 size = oapps.length;
        for (uint256 i = 0; i < size; i++) {
            vm.selectFork(i);
            IOAppSetPeer localOApp = IOAppSetPeer(oapps[i]);
            for (uint256 j = 0; j < size; j++) {
                if (i == j) continue;

                // find remote eid
                vm.selectFork(j);
                IOAppSetPeer remoteOApp = IOAppSetPeer(oapps[j]);
                uint32 remoteEid = (remoteOApp.endpoint()).eid();

                // set remote peer to local
                vm.selectFork(i);
                localOApp.setPeer(remoteEid, addressToBytes32(address(remoteOApp)));
            }
        }
    }

    /**
     * @notice Configures the read channels for multiple OApp instances.
     * @dev Sets each OApp to read from the provided channels.
     * @param oapps An array of addresses representing the deployed OApp instances.
     * @param channels An array of channel IDs to set as read channels.
     */
    function wireReadOApps(address[] memory oapps, uint32[] memory channels) public {
        for (uint256 i = 0; i < oapps.length; i++) {
            IOAppSetReadChannel localOApp = IOAppSetReadChannel(oapps[i]);
            for (uint256 j = 0; j < channels.length; j++) {
                localOApp.setReadChannel(channels[j], true);
            }
        }
    }

    /**
     * @notice Deploys an OApp contract using provided bytecode and constructor arguments.
     * @dev This internal function uses low-level `create` for deploying a new contract.
     * @param _oappBytecode The bytecode of the OApp contract to be deployed.
     * @param _constructorArgs The encoded constructor arguments for the OApp contract.
     * @return addr The address of the newly deployed OApp contract.
     */
    function _deployOApp(bytes memory _oappBytecode, bytes memory _constructorArgs) internal returns (address addr) {
        bytes memory bytecode = bytes.concat(abi.encodePacked(_oappBytecode), _constructorArgs);
        assembly {
            addr := create(0, add(bytecode, 0x20), mload(bytecode))
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }
    }

    /**
     * @notice Schedules a packet for delivery, storing it in the packets queue.
     * @dev Adds the packet to the front of the queue and stores its options for later retrieval.
     * @param _packetBytes The packet data to be scheduled.
     * @param _options The options associated with the packet, used during delivery.
     */
    function schedulePacket(bytes calldata _packetBytes, bytes calldata _options) public {
        uint32 dstEid = _packetBytes.dstEid();
        bytes32 dstAddress = _packetBytes.receiver();
        DoubleEndedQueue.Bytes32Deque storage queue = packetsQueue[dstEid][dstAddress];
        // front in, back out
        bytes32 guid = _packetBytes.guid();
        queue.pushFront(guid);
        packets[guid] = _packetBytes;
        optionsLookup[guid] = _options;
    }

    /**
     * @notice Verifies and processes packets destined for a specific chain and user address.
     * @dev Calls an overloaded version of verifyPackets with default values for packet amount and composer address.
     * @param _dstEid The destination chain's endpoint ID.
     * @param _dstAddress The destination address in bytes32 format.
     */
    function verifyPackets(uint32 _dstEid, bytes32 _dstAddress) public {
        verifyPackets(_dstEid, _dstAddress, 0, address(0x0), bytes(""));
    }

    /**
     * @dev verify packets to destination chain's OApp address.
     * @param _dstEid The destination endpoint ID.
     * @param _dstAddress The destination address.
     */
    function verifyPackets(uint32 _dstEid, address _dstAddress) public {
        verifyPackets(_dstEid, bytes32(uint256(uint160(_dstAddress))), 0, address(0x0), bytes(""));
    }

    /**
     * @dev dst UA receive/execute packets
     * @dev will NOT work calling this directly with composer IF the composed payload is different from the lzReceive msg payload
     */
    function verifyPackets(
        uint32 _dstEid,
        bytes32 _dstAddress,
        uint256 _packetAmount,
        address _composer,
        bytes memory _resolvedPayload
    ) public {
        require(endpoints[_dstEid] != address(0), "endpoint not yet registered");

        DoubleEndedQueue.Bytes32Deque storage queue = packetsQueue[_dstEid][_dstAddress];
        uint256 pendingPacketsSize = queue.length();
        uint256 numberOfPackets;
        if (_packetAmount == 0) {
            numberOfPackets = queue.length();
        } else {
            numberOfPackets = pendingPacketsSize > _packetAmount ? _packetAmount : pendingPacketsSize;
        }
        while (numberOfPackets > 0) {
            numberOfPackets--;
            // front in, back out
            bytes32 guid = queue.popBack();
            bytes memory packetBytes = packets[guid];
            this.assertGuid(packetBytes, guid);
            this.validatePacket(packetBytes, _resolvedPayload);

            bytes memory options = optionsLookup[guid];

            vm.selectFork(eidForkMap[_dstEid]);

            if (_executorOptionExists(options, ExecutorOptions.OPTION_TYPE_NATIVE_DROP)) {
                (uint256 amount, bytes32 receiver) = _parseExecutorNativeDropOption(options);
                address to = address(uint160(uint256(receiver)));
                (bool sent, ) = to.call{ value: amount }("");
                require(sent, "Failed to send Ether");
            }
            if (_executorOptionExists(options, ExecutorOptions.OPTION_TYPE_LZRECEIVE)) {
                this.lzReceive(packetBytes, options);
            }
            if (_executorOptionExists(options, ExecutorOptions.OPTION_TYPE_LZREAD)) {
                this.lzReadReceive(packetBytes, options, _resolvedPayload);
            }
            if (_composer != address(0) && _executorOptionExists(options, ExecutorOptions.OPTION_TYPE_LZCOMPOSE)) {
                this.lzCompose(packetBytes, options, guid, _composer);
            }
        }
    }

    function lzReadReceive(
        bytes calldata _packetBytes,
        bytes memory _options,
        bytes memory _resolvedPayload
    ) external payable {
        EndpointV2 endpoint = EndpointV2(endpoints[_packetBytes.dstEid()]);
        (uint128 gas, , uint128 value) = _parseExecutorLzReadOption(_options);

        Origin memory origin = Origin(_packetBytes.srcEid(), _packetBytes.sender(), _packetBytes.nonce());
        endpoint.lzReceive{ value: value, gas: gas }(
            origin,
            _packetBytes.receiverB20(),
            _packetBytes.guid(),
            _resolvedPayload,
            bytes("")
        );
    }

    function lzReceive(bytes calldata _packetBytes, bytes memory _options) external payable {
        EndpointV2 endpoint = EndpointV2(endpoints[_packetBytes.dstEid()]);
        (uint256 gas, uint256 value) = _parseExecutorLzReceiveOption(_options);

        Origin memory origin = Origin(_packetBytes.srcEid(), _packetBytes.sender(), _packetBytes.nonce());
        endpoint.lzReceive{ value: value, gas: gas }(
            origin,
            _packetBytes.receiverB20(),
            _packetBytes.guid(),
            _packetBytes.message(),
            bytes("")
        );
    }

    function lzCompose(
        bytes calldata _packetBytes,
        bytes memory _options,
        bytes32 _guid,
        address _composer
    ) external payable {
        this.lzCompose(
            _packetBytes.dstEid(),
            _packetBytes.receiverB20(),
            _options,
            _guid,
            _composer,
            _packetBytes.message()
        );
    }

    // @dev the verifyPackets does not know the composeMsg if it is NOT the same as the original lzReceive payload
    // Can call this directly from your test to lzCompose those types of packets
    function lzCompose(
        uint32 _dstEid,
        address _from,
        bytes memory _options,
        bytes32 _guid,
        address _to,
        bytes calldata _composerMsg
    ) external payable {
        EndpointV2 endpoint = EndpointV2(endpoints[_dstEid]);
        (uint16 index, uint256 gas, uint256 value) = _parseExecutorLzComposeOption(_options);
        endpoint.lzCompose{ value: value, gas: gas }(_from, _to, _guid, index, _composerMsg, bytes(""));
    }

    function sign(bytes32 hash) internal pure returns (bytes memory) {
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(1, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    function validatePacket(bytes calldata _packetBytes, bytes memory _resolvedPayload) external {
        uint32 dstEid = _packetBytes.dstEid();
        EndpointV2 endpoint = EndpointV2(endpoints[dstEid]);
        (address receiveLib, ) = endpoint.getReceiveLibrary(_packetBytes.receiverB20(), _packetBytes.srcEid());
        bytes memory packetHeader = _packetBytes.header();

        (uint64 major, , ) = IMessageLib(receiveLib).version();
        if (major == 3) {
            // it is ultra light node
            ReceiveUln302 dstUln = ReceiveUln302(receiveLib);
            bytes memory config = dstUln.getConfig(_packetBytes.srcEid(), _packetBytes.receiverB20(), 2); // CONFIG_TYPE_ULN
            DVN dvn = DVN(abi.decode(config, (UlnConfig)).requiredDVNs[0]);

            bytes32 payloadHash = keccak256(_packetBytes.payload());

            // sign
            bytes memory signatures;
            bytes memory verifyCalldata = abi.encodeWithSelector(
                IReceiveUlnE2.verify.selector,
                packetHeader,
                payloadHash,
                100
            );
            {
                bytes32 hash = dvn.hashCallData(dstEid, address(dstUln), verifyCalldata, block.timestamp + 1000);
                signatures = sign(hash);
            }
            ExecuteParam[] memory params = new ExecuteParam[](1);
            params[0] = ExecuteParam(dstEid, address(dstUln), verifyCalldata, block.timestamp + 1000, signatures);
            dvn.execute(params);

            // commit verification
            bytes memory callData = abi.encodeWithSelector(
                IReceiveUlnE2.commitVerification.selector,
                packetHeader,
                payloadHash
            );
            {
                bytes32 hash = dvn.hashCallData(dstEid, address(dstUln), callData, block.timestamp + 1000);
                signatures = sign(hash);
            }
            params[0] = ExecuteParam(dstEid, address(dstUln), callData, block.timestamp + 1000, signatures);
            dvn.execute(params);
        } else if (major == 10) {
            ReadLib1002 dstUln = ReadLib1002(payable(receiveLib));
            bytes memory config = dstUln.getConfig(_packetBytes.srcEid(), _packetBytes.receiverB20(), 1); // CONFIG_TYPE_CMD_LID_CONFIG
            DVN dvn = DVN(abi.decode(config, (ReadLibConfig)).requiredDVNs[0]);

            bytes32 commandHash = keccak256(_packetBytes.message());
            bytes32 resolvedPayloadHash = keccak256(abi.encodePacked(_packetBytes.guid(), _resolvedPayload));
            bytes memory signatures;

            {
                bytes memory verifyCalldata = abi.encodeWithSelector(
                    ReadLib1002.verify.selector,
                    packetHeader,
                    commandHash,
                    resolvedPayloadHash
                );
                bytes32 hashToSign = dvn.hashCallData(dstEid, address(dstUln), verifyCalldata, block.timestamp + 1000);
                signatures = sign(hashToSign);
                ExecuteParam[] memory params = new ExecuteParam[](1);
                params[0] = ExecuteParam(dstEid, address(dstUln), verifyCalldata, block.timestamp + 1000, signatures);
                dvn.execute(params);
            }

            // commit verification
            {
                bytes memory callData = abi.encodeWithSelector(
                    ReadLib1002.commitVerification.selector,
                    packetHeader,
                    commandHash,
                    resolvedPayloadHash
                );
                bytes32 hashToSign = dvn.hashCallData(dstEid, address(dstUln), callData, block.timestamp + 1000);
                signatures = sign(hashToSign);
                ExecuteParam[] memory params = new ExecuteParam[](1);
                params[0] = ExecuteParam(dstEid, address(dstUln), callData, block.timestamp + 1000, signatures);
                dvn.execute(params);
            }
        } else {
            SimpleMessageLibMock(payable(receiveLib)).validatePacket(_packetBytes);
        }
    }

    function assertGuid(bytes calldata packetBytes, bytes32 guid) external pure {
        bytes32 packetGuid = packetBytes.guid();
        require(packetGuid == guid, "guid not match");
    }

    function registerEndpoint(EndpointV2 endpoint) public {
        endpoints[endpoint.eid()] = address(endpoint);
    }

    function hasPendingPackets(uint16 _dstEid, bytes32 _dstAddress) public view returns (bool flag) {
        DoubleEndedQueue.Bytes32Deque storage queue = packetsQueue[_dstEid][_dstAddress];
        return queue.length() > 0;
    }

    function getNextInflightPacket(uint16 _dstEid, bytes32 _dstAddress) public view returns (bytes memory packetBytes) {
        DoubleEndedQueue.Bytes32Deque storage queue = packetsQueue[_dstEid][_dstAddress];
        if (queue.length() > 0) {
            bytes32 guid = queue.back();
            packetBytes = packets[guid];
        }
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    receive() external payable {}
}
