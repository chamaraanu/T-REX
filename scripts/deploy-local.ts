import { BigNumber, Contract, Signer } from 'ethers';
import { ethers } from "hardhat";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import OnchainID from '@onchain-id/solidity';

import { saveAddress } from "./helpers/saveAddress";


export async function deployIdentityProxy(implementationAuthority: Contract['address'], managementKey: string, deployer: Signer) {
  const identity = await new ethers.ContractFactory(OnchainID.contracts.IdentityProxy.abi, OnchainID.contracts.IdentityProxy.bytecode, deployer).deploy(
    implementationAuthority,
    managementKey,
  );

  return ethers.getContractAt('Identity', identity.address, deployer);
}

/**
 * Main function for deploying contracts and saving their addresses.
 * Orchestrates the deployment process and saves the contract addresses.
 */
async function main() {
  const [deployer, tokenIssuer, tokenAgent, tokenAdmin, claimIssuer, aliceWallet, bobWallet, charlieWallet, davidWallet, anotherWallet] =
    await ethers.getSigners();
  const claimIssuerSigningKey = ethers.Wallet.createRandom();
  const aliceActionKey = ethers.Wallet.createRandom();

  console.log("deployer: " + deployer.address)
  console.log("tokenIssuer: " + tokenIssuer.address)
  console.log("tokenAgent: " + tokenAgent.address)
  console.log("tokenAdmin: " + tokenAdmin.address)
  console.log("claimIssuer: " + claimIssuer.address)
  console.log("aliceWallet: " + aliceWallet.address)
  console.log("bobWallet: " + bobWallet.address)
  console.log("charlieWallet: " + charlieWallet.address)
  console.log("claimIssuerSigningKey: " + claimIssuerSigningKey.address)
  console.log("aliceActionKey: " + aliceActionKey.address)


  // Deploy implementations
  const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry', deployer);
  const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry', deployer);
  const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage', deployer);
  const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry', deployer);
  const modularComplianceImplementation = await ethers.deployContract('ModularCompliance', deployer);
  const tokenImplementation = await ethers.deployContract('Token', deployer);
  const identityImplementation = await new ethers.ContractFactory(
    OnchainID.contracts.Identity.abi,
    OnchainID.contracts.Identity.bytecode,
    deployer,
  ).deploy(deployer.address, true);

  const identityImplementationAuthority = await new ethers.ContractFactory(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode,
    deployer,
  ).deploy(identityImplementation.address);
  console.log("identityImplementationAuthority ", identityImplementationAuthority.address)

  const identityFactory = await new ethers.ContractFactory(
    OnchainID.contracts.Factory.abi, 
    OnchainID.contracts.Factory.bytecode, deployer
  ).deploy(
    identityImplementationAuthority.address,
  );
  console.log("identityFactory ", identityFactory.address)

  const trexImplementationAuthority = await ethers.deployContract(
    'TREXImplementationAuthority',
    [true, ethers.constants.AddressZero, ethers.constants.AddressZero],
    deployer,
  );


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
  await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);

  const trexFactory = await ethers.deployContract('TREXFactory', [trexImplementationAuthority.address, identityFactory.address], deployer);

  await identityFactory.connect(deployer).addTokenFactory(trexFactory.address);

  const claimTopicsRegistry = await ethers
    .deployContract('ClaimTopicsRegistryProxy', [trexImplementationAuthority.address], deployer)
    .then(async (proxy) => ethers.getContractAt('ClaimTopicsRegistry', proxy.address));

  const trustedIssuersRegistry = await ethers
    .deployContract('TrustedIssuersRegistryProxy', [trexImplementationAuthority.address], deployer)
    .then(async (proxy) => ethers.getContractAt('TrustedIssuersRegistry', proxy.address));

  const identityRegistryStorage = await ethers
    .deployContract('IdentityRegistryStorageProxy', [trexImplementationAuthority.address], deployer)
    .then(async (proxy) => ethers.getContractAt('IdentityRegistryStorage', proxy.address));

  const defaultCompliance = await ethers.deployContract('DefaultCompliance', deployer);

  const identityRegistry = await ethers
    .deployContract(
      'IdentityRegistryProxy',
      [trexImplementationAuthority.address, trustedIssuersRegistry.address, claimTopicsRegistry.address, identityRegistryStorage.address],
      deployer,
    )
    .then(async (proxy) => ethers.getContractAt('IdentityRegistry', proxy.address));
  console.log("identityRegistry", identityRegistry.address)

  const tokenOID = await deployIdentityProxy(identityImplementationAuthority.address, tokenIssuer.address, deployer);
  const tokenName = 'TREXDINO';
  const tokenSymbol = 'TREX';
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

  console.log("token", token.address)

  console.log("Deploying agentManager")
  const agentManager = await ethers.deployContract('AgentManager', [token.address], tokenAgent);
  console.log("agentManager", agentManager.address)

  await identityRegistryStorage.connect(deployer).bindIdentityRegistry(identityRegistry.address);

  await token.connect(deployer).addAgent(tokenAgent.address);

  const claimTopics = [ethers.utils.id('CLAIM_TOPIC')];
  await claimTopicsRegistry.connect(deployer).addClaimTopic(claimTopics[0]);

  const claimIssuerContract = await ethers.deployContract('ClaimIssuer', [claimIssuer.address], claimIssuer);
  console.log("claimIssuerContract ", claimIssuerContract.address)

  console.log("before claimIssuer adding key")
  await claimIssuerContract
    .connect(claimIssuer)
    .addKey(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [claimIssuerSigningKey.address])), 3, 1);
  console.log("claimIssuer adding key")

  await trustedIssuersRegistry.connect(deployer).addTrustedIssuer(claimIssuerContract.address, claimTopics);
  console.log("addTrustedIssuer")

  const aliceIdentity = await deployIdentityProxy(identityImplementationAuthority.address, aliceWallet.address, deployer);
  console.log("aliceIdentity", aliceIdentity.address)

  await aliceIdentity
    .connect(aliceWallet)
    .addKey(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [aliceActionKey.address])), 2, 1);

  const bobIdentity = await deployIdentityProxy(identityImplementationAuthority.address, bobWallet.address, deployer);
  console.log("bobIdentity", bobIdentity.address)

  const charlieIdentity = await deployIdentityProxy(identityImplementationAuthority.address, charlieWallet.address, deployer);

  await identityRegistry.connect(deployer).addAgent(tokenAgent.address);
  await identityRegistry.connect(deployer).addAgent(token.address);

  await identityRegistry
    .connect(tokenAgent)
    .batchRegisterIdentity([aliceWallet.address, bobWallet.address], [aliceIdentity.address, bobIdentity.address], [42, 666]);

  const claimForAlice = {
    data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Some claim public data.')),
    issuer: claimIssuerContract.address,
    topic: claimTopics[0],
    scheme: 1,
    identity: aliceIdentity.address,
    signature: '',
  };
  claimForAlice.signature = await claimIssuerSigningKey.signMessage(
    ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address', 'uint256', 'bytes'], [claimForAlice.identity, claimForAlice.topic, claimForAlice.data]),
      ),
    ),
  );

  const aliceClaimId = await aliceIdentity
    .connect(aliceWallet)
    .addClaim(claimForAlice.topic, claimForAlice.scheme, claimForAlice.issuer, claimForAlice.signature, claimForAlice.data, '');
  // console.log("aliceClaimId", aliceClaimId)

  const claimForBob = {
    data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Some claim public data.')),
    issuer: claimIssuerContract.address,
    topic: claimTopics[0],
    scheme: 1,
    identity: bobIdentity.address,
    signature: '',
  };
  claimForBob.signature = await claimIssuerSigningKey.signMessage(
    ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address', 'uint256', 'bytes'], [claimForBob.identity, claimForBob.topic, claimForBob.data]),
      ),
    ),
  );

  await bobIdentity
    .connect(bobWallet)
    .addClaim(claimForBob.topic, claimForBob.scheme, claimForBob.issuer, claimForBob.signature, claimForBob.data, '');

  await token.connect(tokenAgent).mint(aliceWallet.address, 1000);
  await token.connect(tokenAgent).mint(bobWallet.address, 500);

  await agentManager.connect(tokenAgent).addAgentAdmin(tokenAdmin.address);
  await token.connect(deployer).addAgent(agentManager.address);
  await identityRegistry.connect(deployer).addAgent(agentManager.address);

  await token.connect(tokenAgent).unpause();

}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
