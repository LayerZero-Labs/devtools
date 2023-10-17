export const ENDPOINT_ABI = [
	"function defaultSendVersion() view returns (uint16)",
	"function defaultReceiveVersion() view returns (uint16)",
	"function defaultSendLibrary() view returns (address)",
	"function defaultReceiveLibraryAddress() view returns (address)",
	"function uaConfigLookup(address) view returns (tuple(uint16 sendVersion, uint16 receiveVersion, address receiveLibraryAddress, address sendLibrary))"
];

export const MESSAGING_LIBRARY_ABI = [
	"function appConfig(address, uint16) view returns (tuple(uint16 inboundProofLibraryVersion, uint64 inboundBlockConfirmations, address relayer, uint16 outboundProofType, uint64 outboundBlockConfirmations, address oracle))",
	"function defaultAppConfig(uint16) view returns (tuple(uint16 inboundProofLibraryVersion, uint64 inboundBlockConfirmations, address relayer, uint16 outboundProofType, uint64 outboundBlockConfirmations, address oracle))"
];


export const USER_APPLICATION_ABI = [
	"function setConfig(uint16 _version, uint16 _chainId, uint _configType, bytes calldata _config)", 
	"function setSendVersion(uint16 _version)", "function setReceiveVersion(uint16 _version)"
];

export const LZ_APP_ABI = [
	"function setTrustedRemote(uint16 _srcChainId, bytes calldata _path)",
	"function setUseCustomAdapterParams(bool _useCustomAdapterParams)",
	"function setDefaultFeeBp(uint16 _feeBp)",
	"function setFeeBp(uint16 _dstChainId, bool _enabled, uint16 _feeBp)",
	"function setMinDstGas(uint16 _dstChainId, uint16 _packetType, uint _minGas)",
	"function useCustomAdapterParams() public view returns (bool) ",
	"function trustedRemoteLookup(uint16) public view returns (bytes)",
	"function minDstGasLookup(uint16, uint16) public view returns (uint)",
	"function defaultFeeBp() public view returns (uint16)",
	"function chainIdToFeeBps(uint16) public view returns (uint16, bool)",
];