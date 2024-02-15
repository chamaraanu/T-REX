import { BigNumber, Contract, Signer } from 'ethers';
import { ethers } from "hardhat";
import OnchainID from '@onchain-id/solidity';

/**
 * Deploying the identity proxy for each individual to be able to participate in the token functionality
 * @param implementationAuthority Implementation Authority
 * @param managementKey Management Key
 * @param signer Signer
 * @returns 
 */
export async function deployIdentityProxy(implementationAuthority: Contract['address'], managementKey: string, signer: Signer) {
    const identity = await new ethers.ContractFactory(OnchainID.contracts.IdentityProxy.abi, OnchainID.contracts.IdentityProxy.bytecode, signer).deploy(
        implementationAuthority,
        managementKey,
    );

    return ethers.getContractAt('Identity', identity.address, signer);
}

/**
 * Main function for deploying contracts and saving their addresses.
 * Orchestrates the deployment process and saves the contract addresses.
 */
async function main() {
    let [deployer, tokenIssuer, tokenAgent, tokenAdmin, claimIssuer, aliceWallet, bobWallet, charlieWallet, claimIssuerSigningKey, aliceActionKey] = await ethers.getSigners();
    console.log("Deployer is the deployer: ", deployer.address)
    console.log("TokenIssuer: ", tokenIssuer.address)
    console.log("TokenAgent: ", tokenAgent.address)
    console.log("TokenAdmin: ", tokenAdmin.address)
    console.log("ClaimIssuer: ", claimIssuer.address)
    console.log("AliceWallet: ", aliceWallet.address)
    console.log("BobWallet: ", bobWallet.address)
    console.log("CharlieWallet: ", charlieWallet.address)
    console.log("ClaimIssuerSigningKey: ", claimIssuerSigningKey.address)
    console.log("AliceActionKey: ", aliceActionKey.address)

    const token = await ethers.getContractAt("Token", "0x435E9D9f286c6bC033B10942FF8B2c3940b2fD45")
    const claimIssuerContract = await ethers.getContractAt("ClaimIssuer", "0x9eC35B0611221e290470D3cA864EdC4Bd3CCa721")
    const charlieIdentity = await ethers.getContractAt("Identity", "0x35df4EDc421fc0e0095B9CdFd298fa478721b695")

    // await token.connect(tokenAgent).mint(aliceWallet.address, 500);
    // console.log("Minted for Alice")

    // const charlieIdentity = await deployIdentityProxy(identityImplementationAuthority.address, charlieWallet.address, deployer);
    console.log("charlieIdentity: ", charlieIdentity.address)
    // await identityRegistry.connect(tokenAgent).registerIdentity(charlieWallet.address, charlieIdentity.address, 42);
    // console.log("charlieIdentity is registered in identityRegistry")
    const claimTopics = [ethers.utils.id('CLAIM_TOPIC')];
    const claimForCharlie = {
        data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Claim for Charlie, some public data')),
        issuer: claimIssuerContract.address,
        topic: claimTopics[0],
        scheme: 1,
        identity: charlieIdentity.address,
        signature: '',
    };
    claimForCharlie.signature = await claimIssuerSigningKey.signMessage(
        ethers.utils.arrayify(
            ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(['address', 'uint256', 'bytes'], [claimForCharlie.identity, claimForCharlie.topic, claimForCharlie.data]),
            ),
        ),
    );
    // await charlieIdentity
    //     .connect(charlieWallet)
    //     .addClaim(claimForCharlie.topic, claimForCharlie.scheme, claimForCharlie.issuer, claimForCharlie.signature, claimForCharlie.data, '');
    // console.log("charlieIdentity.addClaim")

    await token.connect(aliceWallet).transfer(charlieWallet.address, 10)
    console.log("Alice transfered 10 to Charlie")

    await token.connect(aliceWallet).approve(bobWallet.address, 10)
    await token.connect(bobWallet).transferFrom(aliceWallet.address, charlieWallet.address, 10)
    console.log("Token Agent transferFrom Alice to Charlie, Done")

    await token.connect(tokenAgent).forcedTransfer(aliceWallet.address, charlieWallet.address, 5)
    console.log("TokenAgent did a forced tranfer of 5 from Alice's wallet to Charlie's wallet")

    await token.connect(tokenAgent).burn(aliceWallet.address, 1);
    console.log("TokenAgent burned 1 TREX from Alice's wallet")
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});