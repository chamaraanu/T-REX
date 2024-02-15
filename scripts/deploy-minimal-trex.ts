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
 * Main function for deploying contracts and saving their addresses.
 * Orchestrates the deployment process and saves the contract addresses.
 */
async function main() {
  // let provider = ethers.getDefaultProvider();

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

  const identityImplementationAuthority = await ethers.getContractAt("ImplementationAuthority","0x3191ec3FEBf6F3D26801544D1fd116b53d12b10A")
  const trexImplementationAuthority = await ethers.getContractAt("TREXImplementationAuthority","0xf7dc73894F037ddC87fa327b0912141b3d881278")
  const claimTopicsRegistry = await ethers.getContractAt("ClaimTopicsRegistry","0xB2dcF08161e962A71c4940Ff3b5EfBaFb71CeE67")
  const trustedIssuersRegistry = await ethers.getContractAt("TrustedIssuersRegistry","0xA03019013cD4c622981A8F03bEe81522A714C067")
  const identityRegistryStorage = await ethers.getContractAt("IdentityRegistryStorage","0x5e8f7FC28c3090A437B9066e299C8b4b4203F1B3")
  // const defaultCompliance = await ethers.getContractAt("DefaultCompliance","0x63aF369E38E56B26695CFE334fCA62FF144DD52F")
  // const identityRegistry = await ethers.getContractAt("IdentityRegistry","0x41B07810A74cD65D26823A6b0282DA39B0b620A3")
  // const tokenOID = await ethers.getContractAt("Identity","0xacf8b615918263fFC35B5524c3e1b2303A1118eE")

  // Deploy implementations

  const defaultCompliance = await ethers.deployContract('DefaultCompliance', deployer);
  console.log("defaultCompliance: ", defaultCompliance.address)
  const identityRegistry = await ethers
    .deployContract(
      'IdentityRegistryProxy',
      [trexImplementationAuthority.address, trustedIssuersRegistry.address, claimTopicsRegistry.address, identityRegistryStorage.address],
      deployer,
    )
    .then(async (proxy) => ethers.getContractAt('IdentityRegistry', proxy.address));
  console.log("identityRegistry: ", identityRegistry.address)

  const tokenOID = await deployIdentityProxy(identityImplementationAuthority.address, tokenIssuer.address, deployer);
  console.log("tokenOID: ", tokenOID.address)

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

  // await identityRegistryStorage.connect(deployer).bindIdentityRegistry(identityRegistry.address);
  // console.log("identityRegistryStorage.bindIdentityRegistry")

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
