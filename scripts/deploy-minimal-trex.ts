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
 * Minimal TREX token deployment
 * with reusing dependency contracts (as platform maintained dependencies)
 * 
 * identityRegistryStorage	old	old	old	old	new
 * defaultCompliance  old	old	old	new	new
 * identityRegistry	  old	old	new	old	old
 * tokenOID	          old	new	old	old	old
 * token	            X	  X	  X	  Can	Can
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

  const trexImplementationAuthority = await ethers.getContractAt("TREXImplementationAuthority","0xf7dc73894F037ddC87fa327b0912141b3d881278")
  const identityRegistry = await ethers.getContractAt("IdentityRegistry","0x41B07810A74cD65D26823A6b0282DA39B0b620A3")
  const tokenOID = await ethers.getContractAt("Identity","0xacf8b615918263fFC35B5524c3e1b2303A1118eE")

  // Deploy implementations
  const defaultCompliance = await ethers.deployContract('DefaultCompliance', deployer);
  console.log("defaultCompliance: ", defaultCompliance.address)

  const tokenName = 'TREXDINO2';
  const tokenSymbol = 'TREX2';
  const tokenDecimals = BigNumber.from('0');
  const token = await ethers
    .deployContract(
      'TokenProxy',
      [
        trexImplementationAuthority.address,
        identityRegistry.address,
        defaultCompliance.address,
        tokenName,
        tokenSymbol,
        tokenDecimals,
        tokenOID.address,
      ],
      deployer,
    )
    .then(async (proxy) => ethers.getContractAt('Token', proxy.address)); 
  console.log("token: ", token.address)

  // If different wallets needs to be registered for different tokens, 
  // then different identity registry and identity registry storage needs to be deployed and the identities of the wallets needs to be registered

  await token.connect(deployer).addAgent(tokenAgent.address);
  console.log("token.addAgent")
  console.log("Is Agent?", await token.connect(deployer).isAgent(tokenAgent.address))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
