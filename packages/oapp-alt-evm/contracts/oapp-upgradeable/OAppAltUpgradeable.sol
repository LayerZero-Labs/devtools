// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

// @dev Import the 'MessagingFee' and 'MessagingReceipt' so it's exposed to OApp implementers
// solhint-disable-next-line no-unused-import
import { MessagingParams, MessagingFee, MessagingReceipt } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

// @dev Import the 'Origin' so it's exposed to OApp implementers
// solhint-disable-next-line no-unused-import
import { OAppReceiverUpgradeable, Origin } from "@layerzerolabs/oapp-evm-upgradeable/contracts/oapp/OAppReceiverUpgradeable.sol";
import { OAppCoreUpgradeable } from "@layerzerolabs/oapp-evm-upgradeable/contracts/oapp/OAppCoreUpgradeable.sol";

import { OAppSenderAltUpgradeable, OAppSenderUpgradeable } from "./OAppSenderAltUpgradeable.sol";

/**
 * @title OAppAltUpgradeable
 * @dev Abstract contract serving as the base for OAppAlt implementation, combining OAppSenderAltUpgradeable and OAppReceiverUpgradeable functionality.
 * @dev This is used to interact with LayerZero's EndpointV2Alt

 */
abstract contract OAppAltUpgradeable is OAppSenderAltUpgradeable, OAppReceiverUpgradeable {
    /**
     * @dev Constructor to initialize the OApp with the provided endpoint and owner.
     * @param _endpoint The address of the LOCAL LayerZero endpoint.
     */

    constructor(address _endpoint) OAppCoreUpgradeable(_endpoint) {}

    /**
     * @dev Initializes the OAppAlt with the provided delegate.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     *
     * @dev The delegate typically should be set as the owner of the contract.
     * @dev Ownable is not initialized here on purpose. It should be initialized in the child contract to
     * accommodate the different version of Ownable.
     */
    function __OAppAlt_init(address _delegate) internal onlyInitializing {
        __OAppCore_init(_delegate);
        __OAppReceiver_init_unchained();
        __OAppSenderAlt_init_unchained();
    }

    function __OAppAlt_init_unchained() internal onlyInitializing {}

    /**
     * @notice Retrieves the OApp version information.
     * @return senderVersion The version of the OAppSender.sol implementation.
     * @return receiverVersion The version of the OAppReceiver.sol implementation.
     */
    function oAppVersion()
        public
        pure
        virtual
        override(OAppSenderUpgradeable, OAppReceiverUpgradeable)
        returns (uint64 senderVersion, uint64 receiverVersion)
    {
        return (SENDER_VERSION, RECEIVER_VERSION);
    }
}
