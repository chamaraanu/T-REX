import { BigNumber, Contract, Signer } from 'ethers';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import OnchainID from '@onchain-id/solidity';

import { saveAddress } from "./helpers/saveAddress";
import { agent } from '../typechain-types/contracts/roles/permissioning';


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
  const identityRegistryStorage = await ethers.getContractAt("IdentityRegistryStorage","0x5e8f7FC28c3090A437B9066e299C8b4b4203F1B3")
  const defaultCompliance = await ethers.getContractAt("DefaultCompliance","0x63aF369E38E56B26695CFE334fCA62FF144DD52F")
  const identityRegistry = await ethers.getContractAt("IdentityRegistry","0x41B07810A74cD65D26823A6b0282DA39B0b620A3")
  const tokenOID = await ethers.getContractAt("Identity","0xacf8b615918263fFC35B5524c3e1b2303A1118eE")
  const token = await ethers.getContractAt("Token","0x435E9D9f286c6bC033B10942FF8B2c3940b2fD45")
  const agentManager = await ethers.getContractAt("AgentManager","0x190B92BD91De88DBf660E7682459f6d16bA602ad")
  const claimIssuerContract = await ethers.getContractAt("ClaimIssuer","0x9eC35B0611221e290470D3cA864EdC4Bd3CCa721")
  const aliceIdentity = await ethers.getContractAt("Identity","0x64751a47a92Bb5FE541fCb127d54FE1365d7C124")
  const bobIdentity = await ethers.getContractAt("Identity","0x5110E0F1CE403cdFb92BD2Ab380075E8a4dA83a9")
  

  // Deploy implementations
  // const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry', deployer);
  // await claimTopicsRegistryImplementation.waitForDeployment();
  console.log("claimTopicsRegistryImplementation: ", claimTopicsRegistryImplementation.address)
  // const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry', deployer);
  console.log("trustedIssuersRegistryImplementation: ", trustedIssuersRegistryImplementation.address)
  // const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage', deployer);
  console.log("identityRegistryStorageImplementation: ", identityRegistryStorageImplementation.address)
  // const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry', deployer);
  console.log("identityRegistryImplementation: ", identityRegistryImplementation.address)
  // const modularComplianceImplementation = await ethers.deployContract('ModularCompliance', deployer);
  console.log("modularComplianceImplementation: ", modularComplianceImplementation.address)
  // const tokenImplementation = await ethers.deployContract('Token', deployer);
  console.log("tokenImplementation: ", tokenImplementation.address)
  // const identityImplementation = await new ethers.ContractFactory(
  //   OnchainID.contracts.Identity.abi,
  //   OnchainID.contracts.Identity.bytecode,
  //   deployer,
  // ).deploy(deployer.address, true);
  console.log("identityImplementation: ", identityImplementation.address)

  // const identityImplementationAuthority = await new ethers.ContractFactory(
  //   OnchainID.contracts.ImplementationAuthority.abi,
  //   OnchainID.contracts.ImplementationAuthority.bytecode,
  //   deployer,
  // ).deploy(identityImplementation.address);
  console.log("identityImplementationAuthority: ", identityImplementationAuthority.address)

  // const identityFactory = await new ethers.ContractFactory(OnchainID.contracts.Factory.abi, OnchainID.contracts.Factory.bytecode, deployer).deploy(
  //   identityImplementationAuthority.address,
  // );
  console.log("identityFactory: ", identityFactory.address)

  // const trexImplementationAuthority = await ethers.deployContract(
  //   'TREXImplementationAuthority',
  //   [true, ethers.constants.AddressZero, ethers.constants.AddressZero],
  //   deployer,
  // );
  console.log("trexImplementationAuthority: ", trexImplementationAuthority.address)
  const versionStruct = {
    major: 4,
    minor: 0,
    patch: 0,
  };
  const contractsStruct = {
    tokenImplementation: tokenImplementation.address,
    ctrImplementation: claimTopicsRegistryImplementation.address,
    irImplementation: identityRegistryImplementation.address,
    irsImplementation: identityRegistryStorageImplementation.address,
    tirImplementation: trustedIssuersRegistryImplementation.address,
    mcImplementation: modularComplianceImplementation.address,
  };
  // await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);
  // console.log("trexImplementationAuthority.addAndUseTREXVersion done")

  // const trexFactory = await ethers.deployContract('TREXFactory', [trexImplementationAuthority.address, identityFactory.address], deployer);
  console.log("trexFactory: ", trexFactory.address)
  // await identityFactory.connect(deployer).addTokenFactory(trexFactory.address);
  // console.log("identityFactory.addTokenFactory done")

  // const claimTopicsRegistry = await ethers
  //   .deployContract('ClaimTopicsRegistryProxy', [trexImplementationAuthority.address], deployer)
  //   .then(async (proxy) => ethers.getContractAt('ClaimTopicsRegistry', proxy.address));
  console.log("claimTopicsRegistry: ", claimTopicsRegistry.address)

  // const trustedIssuersRegistry = await ethers
  //   .deployContract('TrustedIssuersRegistryProxy', [trexImplementationAuthority.address], deployer)
  //   .then(async (proxy) => ethers.getContractAt('TrustedIssuersRegistry', proxy.address));
  console.log("trustedIssuersRegistry: ", trustedIssuersRegistry.address)

  // const identityRegistryStorage = await ethers
  //   .deployContract('IdentityRegistryStorageProxy', [trexImplementationAuthority.address], deployer)
  //   .then(async (proxy) => ethers.getContractAt('IdentityRegistryStorage', proxy.address));
  console.log("identityRegistryStorage: ", identityRegistryStorage.address)

  // const defaultCompliance = await ethers.deployContract('DefaultCompliance', deployer);
  console.log("defaultCompliance: ", defaultCompliance.address)

  // const identityRegistry = await ethers
  //   .deployContract(
  //     'IdentityRegistryProxy',
  //     [trexImplementationAuthority.address, trustedIssuersRegistry.address, claimTopicsRegistry.address, identityRegistryStorage.address],
  //     deployer,
  //   )
  //   .then(async (proxy) => ethers.getContractAt('IdentityRegistry', proxy.address));
  console.log("identityRegistry: ", identityRegistry.address)

  // const tokenOID = await deployIdentityProxy(identityImplementationAuthority.address, tokenIssuer.address, deployer);
  console.log("tokenOID: ", tokenOID.address)
  const tokenName = 'TREXDINO';
  const tokenSymbol = 'TREX';
  const tokenDecimals = BigNumber.from('0');
  // const token = await ethers
  //   .deployContract(
  //     'TokenProxy',
  //     [
  //       trexImplementationAuthority.address,
  //       identityRegistry.address,
  //       defaultCompliance.address,
  //       tokenName,
  //       tokenSymbol,
  //       tokenDecimals,
  //       tokenOID.address,
  //     ],
  //     deployer,
  //   )
  //   .then(async (proxy) => ethers.getContractAt('Token', proxy.address)); 
  console.log("token: ", token.address)

  // const agentManager = await ethers.deployContract('AgentManager', [token.address], tokenAgent);
  console.log("agentManager: ", agentManager.address)

  // await identityRegistryStorage.connect(deployer).bindIdentityRegistry(identityRegistry.address);
  // console.log("identityRegistryStorage.bindIdentityRegistry")

  // await token.connect(deployer).addAgent(tokenAgent.address);
  // console.log("token.addAgent")
  console.log("Is Agent?", await token.connect(deployer).isAgent(tokenAgent.address))

  const claimTopics = [ethers.utils.id('CLAIM_TOPIC')];
  // await claimTopicsRegistry.connect(deployer).addClaimTopic(claimTopics[0]);
  // console.log("claimTopicsRegistry.addClaimTopic")

  // const claimIssuerContract = await ethers.deployContract('ClaimIssuer', [claimIssuer.address], claimIssuer);
  console.log("claimIssuerContract: ", claimIssuerContract.address)
  // await claimIssuerContract
  //   .connect(claimIssuer)
  //   .addKey(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [claimIssuerSigningKey.address])), 3, 1);
  // console.log("claimIssuerContract.addKey")

  // await trustedIssuersRegistry.connect(deployer).addTrustedIssuer(claimIssuerContract.address, claimTopics);
  // console.log("trustedIssuersRegistry.addTrustedIssuer")

  // const aliceIdentity = await deployIdentityProxy(identityImplementationAuthority.address, aliceWallet.address, deployer);
  console.log("aliceIdentity: ", aliceIdentity.address)
  // await aliceIdentity
  //   .connect(aliceWallet)
  //   .addKey(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [aliceActionKey.address])), 2, 1);
  // console.log("aliceIdentity.addKey")
  // const bobIdentity = await deployIdentityProxy(identityImplementationAuthority.address, bobWallet.address, deployer);
  console.log("bobIdentity: ", bobIdentity.address)
  // const charlieIdentity = await deployIdentityProxy(identityImplementationAuthority.address, charlieWallet.address, deployer);

  // await identityRegistry.connect(deployer).addAgent(tokenAgent.address);
  // console.log("identityRegistry.addAgent(tokenAgent.address)")
  // await identityRegistry.connect(deployer).addAgent(token.address);
  // console.log("identityRegistry.addAgent(token.address)")

  // await identityRegistry
  //   .connect(tokenAgent)
  //   .batchRegisterIdentity([aliceWallet.address, bobWallet.address], [aliceIdentity.address, bobIdentity.address], [42, 666]);
  // console.log("identityRegistry.batchRegisterIdentity")

  const claimForAlice = {
    data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Some claim public data.')),
    issuer: claimIssuerContract.address,
    topic: claimTopics[0],
    scheme: 1,
    identity: aliceIdentity.address,
    signature: '',
  };
  // claimForAlice.signature = await claimIssuerSigningKey.signMessage(
  //   ethers.utils.arrayify(
  //     ethers.utils.keccak256(
  //       ethers.utils.defaultAbiCoder.encode(['address', 'uint256', 'bytes'], [claimForAlice.identity, claimForAlice.topic, claimForAlice.data]),
  //     ),
  //   ),
  // );
  // console.log("claimForAlice.signature")

  // await aliceIdentity
  //   .connect(aliceWallet)
  //   .addClaim(claimForAlice.topic, claimForAlice.scheme, claimForAlice.issuer, claimForAlice.signature, claimForAlice.data, '');
  // console.log("aliceIdentity.addClaim")

  const claimForBob = {
    data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Some claim public data.')),
    issuer: claimIssuerContract.address,
    topic: claimTopics[0],
    scheme: 1,
    identity: bobIdentity.address,
    signature: '',
  };
  // claimForBob.signature = await claimIssuerSigningKey.signMessage(
  //   ethers.utils.arrayify(
  //     ethers.utils.keccak256(
  //       ethers.utils.defaultAbiCoder.encode(['address', 'uint256', 'bytes'], [claimForBob.identity, claimForBob.topic, claimForBob.data]),
  //     ),
  //   ),
  // );
  // console.log("claimForBob.signature")

  // await bobIdentity
  //   .connect(bobWallet)
  //   .addClaim(claimForBob.topic, claimForBob.scheme, claimForBob.issuer, claimForBob.signature, claimForBob.data, '');
  //   console.log("bobIdentity.addClaim")

  await token.connect(tokenAgent).mint(aliceWallet.address, 1000);
  console.log("Minted for Alice")
  await token.connect(tokenAgent).mint(bobWallet.address, 500);
  console.log("Minted for Bob")

  await agentManager.connect(tokenAgent).addAgentAdmin(tokenAdmin.address);
  console.log("agentManager.addAgentAdmin")
  await token.connect(deployer).addAgent(agentManager.address);
  console.log("token.addAgent")
  await identityRegistry.connect(deployer).addAgent(agentManager.address);
  console.log("identityRegistry.addAgent")

  await token.connect(tokenAgent).unpause();
  console.log("token unpause")

  // Save contract addresses to JSON
  // let jsonData = {
  //   "claimTopicsRegistryImplementation": claimTopicsRegistryImplementation,
  //   "trustedIssuersRegistryImplementation": trustedIssuersRegistryImplementation,
  //   "identityRegistryStorageImplementation": identityRegistryStorageImplementation,
  //   "identityRegistryImplementation": identityRegistryImplementation,
  //   "modularComplianceImplementation": modularComplianceImplementation,
  //   "tokenImplementation":tokenImplementation,
  //   "identityImplementation":identityImplementation
  // };

  // // Save JSON object containing contract addresses
  // saveAddress(jsonData);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
