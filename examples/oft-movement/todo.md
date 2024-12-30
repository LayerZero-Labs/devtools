# Deploy 
1. Create a `deploy/` version of alex's move script - that checks for build, if not build then it builds, then deploys, and inits.
    - This changes the deploy script and the user no longer needs to pass in digusting amounts of parameters via cli - abstraction gud
2. Is the delegate not set on deploy? If not and it is a required step then:
    - If the deployer NEEDS to be the delegate to wire. Then set that by default and take in user perms.

# Hardhat Tasks 
1. Create hardhat tasks for the newly created scripts.
    - Accept `lz.config` as a parameter