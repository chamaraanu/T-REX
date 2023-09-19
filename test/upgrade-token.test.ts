import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployFullSuiteFixture } from './fixtures/deploy-full-suite.fixture';

describe.only('MigrationContract', () => {
  async function deployMigrationAndLegacyTokenFixture() {
    const context = await loadFixture(deployFullSuiteFixture);
    const {
      accounts: { deployer },
      authorities: { trexImplementationAuthority },
      factories: { identityFactory },
      suite: { claimIssuerContract },
    } = context;

    const oldTokenImplementation = await ethers.deployContract('LegacyToken_3_5_2', deployer);
    const oldTokenImplementationAuthority = await ethers.deployContract('LegacyIA', [oldTokenImplementation.address], deployer);
    const oldCompliance = await ethers.deployContract('DefaultCompliance', deployer);
    const oldTrustedIssuersRegistry = await ethers.deployContract('TrustedIssuersRegistryLegacy', deployer);
    //await oldTrustedIssuersRegistry.addTrustedIssuer(claimIssuerContract.address, [42, 666]);

    const oldClaimTopicsRegistry = await ethers.deployContract('ClaimTopicsRegistryLegacy', deployer);
    await oldClaimTopicsRegistry.addClaimTopic(42);
    await oldClaimTopicsRegistry.addClaimTopic(666);

    const oldIdentityRegistryStorage = await ethers.deployContract('IdentityRegistryStorageLegacy', deployer);
    const oldIdentityRegistry = await ethers.deployContract(
      'IdentityRegistryLegacy',
      [oldTrustedIssuersRegistry.address, oldClaimTopicsRegistry.address, oldIdentityRegistryStorage.address],
      deployer,
    );
    await oldIdentityRegistryStorage.bindIdentityRegistry(oldIdentityRegistry.address);
    const oldToken = await ethers
      .deployContract(
        'LegacyProxy',
        [
          oldTokenImplementationAuthority.address,
          oldIdentityRegistry.address,
          oldCompliance.address,
          'LEGACY',
          'TOK',
          8,
          ethers.constants.AddressZero,
        ],
        deployer,
      )
      .then((contract) => ethers.getContractAt('LegacyToken_3_5_2', contract.address));

    const migrationContract = await ethers.deployContract('MigrationContract', [trexImplementationAuthority.address, identityFactory.address]);

    await identityFactory.addTokenFactory(migrationContract.address);

    await oldToken.connect(deployer).transferOwnershipOnTokenContract(migrationContract.address);
    await oldIdentityRegistryStorage.transferOwnershipOnIdentityRegistryStorage(migrationContract.address);

    return { ...context, suite: { ...context.suite, migrationContract, oldToken } };
  }

  describe('.migrateToken()', () => {
    describe('when _newIRS is true', () => {
      it('should deploy new proxies and upgrade the token', async () => {
        const {
          accounts: { anotherWallet },
          suite: { migrationContract, oldToken },
        } = await loadFixture(deployMigrationAndLegacyTokenFixture);

        const tx = await migrationContract.migrateToken(oldToken.address, true, anotherWallet.address, [anotherWallet.address]);

        await expect(tx).to.emit(migrationContract, 'TREXSuiteMigrated');
      });
    });

    describe('when _newIRS is false', () => {
      it('should deploy new proxies and upgrade the token', async () => {
        const {
          accounts: { anotherWallet },
          suite: { migrationContract, oldToken },
        } = await loadFixture(deployMigrationAndLegacyTokenFixture);

        const tx = await migrationContract.migrateToken(oldToken.address, false, anotherWallet.address, [anotherWallet.address]);

        await expect(tx).to.emit(migrationContract, 'TREXSuiteMigrated');
      });
    });
  });
});
