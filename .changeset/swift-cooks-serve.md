---
"@layerzerolabs/onft-evm": patch
---

Fixed a bug in ONFT721MsgCodec. It was ignoring the SENDER offset when decoding composed messages. Added a SENDER_OFFSET variable and replaced the old TOKEN_ID_OFFSET with it for composed messages decoding.
