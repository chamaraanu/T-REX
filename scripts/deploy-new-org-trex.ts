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
 * defaultCompliance        old	old	old	new	new
 * identityRegistry	        old	old	new	old	old
 * tokenOID	                old	new	old	old	old
 * token	                  X	  X	  X	  Can	Can
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

  const claimTopicsRegistryImplementation = await ethers.getContractAt("ClaimTopicsRegistry","0x8766CA45E6F195FfF1B5ddeE870Cf618E89a708a")
  const trustedIssuersRegistryImplementation = await ethers.getContractAt("TrustedIssuersRegistry","0xed96967E5C65E9A3A6a50655ea3E4ec8e6cEE2f1")
  const identityRegistryStorageImplementation = await ethers.getContractAt("IdentityRegistryStorage","0x9470250b37CF20b98C5BE35c7A87924134612fC5")
  const identityRegistryImplementation = await ethers.getContractAt("IdentityRegistry","0xa7aBb8C3346d7871118a8D901B2A98A8e0a6199D")
  const modularComplianceImplementation = await ethers.getContractAt("ModularCompliance","0x68df92e82D8af6fdd40fcd5237c1661Baecdf9fc")
  const tokenImplementation = await ethers.getContractAt("Token","0x649869f301dD6993F2024C19a08d8BCf9093f8c3")
  const identityImplementation = await ethers.getContractAt("Identity","0x8A647830dc91b0d848530d520163Fc8B5A01ec7f")
  const identityImplementationAuthority = await ethers.getContractAt("ImplementationAuthority","0x3191ec3FEBf6F3D26801544D1fd116b53d12b10A")
  const identityFactory = await ethers.getContractAt("IIdFactory","0xce7C51e74F0Ca2d34fbD92eBB4FD77905a94610E")
  const trexImplementationAuthority = await ethers.getContractAt("TREXImplementationAuthority","0xf7dc73894F037ddC87fa327b0912141b3d881278")
  const trexFactory = await ethers.getContractAt("TREXFactory","0x88cebFe8d4c10c1e54a1d55B0955a074FBd2D1Cb")
  const claimTopicsRegistry = await ethers.getContractAt("ClaimTopicsRegistry","0xB2dcF08161e962A71c4940Ff3b5EfBaFb71CeE67")
  const trustedIssuersRegistry = await ethers.getContractAt("TrustedIssuersRegistry","0xA03019013cD4c622981A8F03bEe81522A714C067")
  const claimIssuerContract = await ethers.getContractAt("ClaimIssuer","0x9eC35B0611221e290470D3cA864EdC4Bd3CCa721")

  // Deploy implementations

  const identityRegistryStorage = await ethers
    .deployContract('IdentityRegistryStorageProxy', [trexImplementationAuthority.address], deployer)
    .then(async (proxy) => ethers.getContractAt('IdentityRegistryStorage', proxy.address));
  console.log("identityRegistryStorage: ", identityRegistryStorage.address)

  const identityRegistry = await ethers
    .deployContract(
      'IdentityRegistryProxy',
      [trexImplementationAuthority.address, trustedIssuersRegistry.address, claimTopicsRegistry.address, identityRegistryStorage.address],
      deployer,
    )
    .then(async (proxy) => ethers.getContractAt('IdentityRegistry', proxy.address));
  console.log("identityRegistry: ", identityRegistry.address)

  const defaultCompliance = await ethers.deployContract('DefaultCompliance', deployer);
  console.log("defaultCompliance: ", defaultCompliance.address)

  const tokenOID = await deployIdentityProxy(identityImplementationAuthority.address, tokenIssuer.address, deployer);
  console.log("tokenOID", tokenOID.address)

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

  const agentManager = await ethers.deployContract('AgentManager', [token.address], tokenAgent);
  console.log("agentManager: ", agentManager.address)

  await identityRegistryStorage.connect(deployer).bindIdentityRegistry(identityRegistry.address);
  console.log("identityRegistryStorage.bindIdentityRegistry")

  await token.connect(deployer).addAgent(tokenAgent.address);
  console.log("token.addAgent")
  console.log("Is Agent?", await token.connect(deployer).isAgent(tokenAgent.address))

  const charlieIdentity = await deployIdentityProxy(identityImplementationAuthority.address, charlieWallet.address, deployer);
  console.log("charlieIdentity: ", charlieIdentity.address)
  await charlieIdentity
    .connect(charlieWallet)
    .addKey(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [aliceActionKey.address])), 2, 1);
  console.log("charlieIdentity.addKey")

  await identityRegistry.connect(deployer).addAgent(tokenAgent.address);
  console.log("identityRegistry.addAgent(tokenAgent.address)")
  await identityRegistry.connect(deployer).addAgent(token.address);
  console.log("identityRegistry.addAgent(token.address)")

  await identityRegistry.connect(tokenAgent)
  .registerIdentity(charlieWallet.address, charlieIdentity.address, 42);
  console.log("identityRegistry.registerIdentity for Charlie")

  const claimTopics = [ethers.utils.id('CLAIM_TOPIC')];

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

  await charlieIdentity
    .connect(charlieWallet)
    .addClaim(claimForCharlie.topic, claimForCharlie.scheme, claimForCharlie.issuer, claimForCharlie.signature, claimForCharlie.data, '');
  console.log("charlieIdentity.addClaim")

  await token.connect(tokenAgent).mint(charlieWallet.address, 1000);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
