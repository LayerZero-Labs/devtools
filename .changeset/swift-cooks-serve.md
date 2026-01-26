---
"@layerzerolabs/onft-evm": patch
---

The ONFT721MsgCodec library composeMsg function was ignoring the sender offset when decoding composed messages. Added a new SENDER_OFFSET constant variable and 2 new helper functions composeMsgFrom and composeMsgPayload to decode every member of the composed message separately and keep backwards compatibility.
