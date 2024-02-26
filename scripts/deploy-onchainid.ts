import { BigNumber, Contract, Signer } from 'ethers';
import { ethers } from "hardhat";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import OnchainID from '@onchain-id/solidity';

import { saveAddress } from "./helpers/saveAddress";
import { agent } from '../typechain-types/contracts/roles/permissioning';

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
 * Deployment of ONCHIAINID for Charlie
 * including the dependency contracts
 * which will be used as platform maintained dependencies
 */
async function main() {
  // let provider = ethers.getDefaultProvider();

  let [deployer, tokenIssuer, tokenAgent, tokenAdmin, claimIssuer, aliceWallet, bobWallet, charlieWallet, claimIssuerSigningKey, aliceActionKey] = await ethers.getSigners();
  console.log("Deployer: ", deployer.address)
  // console.log("TokenIssuer: ", tokenIssuer.address)
  console.log("TokenAgent: ", tokenAgent.address)
  // console.log("TokenAdmin: ", tokenAdmin.address)
  // console.log("ClaimIssuer: ", claimIssuer.address)
  // console.log("AliceWallet: ", aliceWallet.address)
  // console.log("BobWallet: ", bobWallet.address)
  console.log("CharlieWallet: ", charlieWallet.address)
  console.log("ClaimIssuerSigningKey: ", claimIssuerSigningKey.address)
  console.log("AliceActionKey: ", aliceActionKey.address)

  const identityImplementationAuthority = await ethers.getContractAt("ImplementationAuthority","0x3191ec3FEBf6F3D26801544D1fd116b53d12b10A") // Change at every dependency deployment
  const identityRegistry = await ethers.getContractAt("IdentityRegistry","0x41B07810A74cD65D26823A6b0282DA39B0b620A3") // Change at every dependency deployment
  const claimIssuerContract = await ethers.getContractAt("ClaimIssuer","0x9eC35B0611221e290470D3cA864EdC4Bd3CCa721") // Change at every dependency deployment
  // const charlieIdentity = await ethers.getContractAt("Identity","0x069F06EE52Ec947AB3ec56F46bF9DfDa62259ADA")
  
  const claimTopics = [ethers.utils.id('CLAIM_TOPIC')];

  const charlieIdentity = await deployIdentityProxy(identityImplementationAuthority.address, charlieWallet.address, deployer);
  console.log("ONCHAINID is deployed for Charlie: ", charlieIdentity.address)
  await charlieIdentity
    .connect(charlieWallet)
    .addKey(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [aliceActionKey.address])), 2, 1);
  console.log("charlieIdentity.addKey aliceActionKey")

  console.log("IsAgent ", await identityRegistry.connect(deployer).isAgent(tokenAgent.address)); 

  // await identityRegistry.connect(tokenAgent).registerIdentity(charlieWallet.address, charlieIdentity.address, 42)
  await identityRegistry.connect(tokenAgent).updateIdentity(charlieWallet.address, charlieIdentity.address)

  const claimForCharlie = {
    data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Some claim public data.')),
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
  console.log("claimForCharlie.signature")

  console.log("charlieIdentity isClaimValid" ,await claimIssuerContract.connect(tokenAgent).isClaimValid(charlieIdentity.address, claimForCharlie.topic, claimForCharlie.signature, claimForCharlie.data));
  await charlieIdentity
    .connect(charlieWallet)
    .addClaim(claimForCharlie.topic, claimForCharlie.scheme, claimForCharlie.issuer, claimForCharlie.signature, claimForCharlie.data, '');
  console.log("charlieIdentity.addClaim")
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
