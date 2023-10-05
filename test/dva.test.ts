import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { deployFullSuiteFixture } from './fixtures/deploy-full-suite.fixture';

describe('DVATransferManager', () => {
  async function deployFullSuiteWithTransferManager() {
    const context = await loadFixture(deployFullSuiteFixture);

    const transferManager = await ethers.deployContract('DVATransferManager');

    return {
      ...context,
      suite: {
        ...context.suite,
        transferManager,
      },
    };
  }

  async function deployFullSuiteWithVerifiedTransferManager() {
    const context = await loadFixture(deployFullSuiteWithTransferManager);
    const identity = await context.suite.identityRegistry.identity(context.accounts.aliceWallet.address);
    await context.suite.identityRegistry.connect(context.accounts.tokenAgent).registerIdentity(context.suite.transferManager.address, identity, 0);
    return context;
  }

  async function deployFullSuiteWithNonSequentialTransfer() {
    const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
    await context.suite.transferManager.connect(context.accounts.tokenAgent).modifyApprovalCriteria({
      tokenAddress: context.suite.token.address,
      includeRecipientApprover: true,
      includeAgentApprover: true,
      sequentialApproval: false,
      additionalApprovers: [context.accounts.charlieWallet.address],
    });

    await context.suite.token.connect(context.accounts.aliceWallet).approve(context.suite.transferManager.address, 100000);
    const transferID = await context.suite.transferManager.calculateTransferID(
      0,
      context.accounts.aliceWallet.address,
      context.accounts.bobWallet.address,
      100,
    );

    await context.suite.transferManager
      .connect(context.accounts.aliceWallet)
      .initiateTransfer(context.suite.token.address, context.accounts.bobWallet.address, 100);

    return {
      ...context,
      transferID,
    };
  }

  async function deployFullSuiteWithSequentialTransfer() {
    const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
    await context.suite.transferManager.connect(context.accounts.tokenAgent).modifyApprovalCriteria({
      tokenAddress: context.suite.token.address,
      includeRecipientApprover: true,
      includeAgentApprover: true,
      sequentialApproval: true,
      additionalApprovers: [context.accounts.charlieWallet.address],
    });

    await context.suite.token.connect(context.accounts.aliceWallet).approve(context.suite.transferManager.address, 100000);
    const transferID = await context.suite.transferManager.calculateTransferID(
      0,
      context.accounts.aliceWallet.address,
      context.accounts.bobWallet.address,
      100,
    );

    await context.suite.transferManager
      .connect(context.accounts.aliceWallet)
      .initiateTransfer(context.suite.token.address, context.accounts.bobWallet.address, 100);

    return {
      ...context,
      transferID,
    };
  }

  describe('.modifyApprovalCriteria', () => {
    describe('when sender is not a token agent', () => {
      it('should revert', async () => {
        const context = await loadFixture(deployFullSuiteWithTransferManager);

        await expect(
          context.suite.transferManager.connect(context.accounts.anotherWallet).modifyApprovalCriteria({
            tokenAddress: context.suite.token.address,
            includeRecipientApprover: false,
            includeAgentApprover: true,
            sequentialApproval: true,
            additionalApprovers: [],
          }),
        ).to.be.revertedWithCustomError(context.suite.transferManager, `OnlyTokenAgentCanCall`);
      });
    });

    describe('when sender is a token agent', () => {
      describe('when DVA Manager is not verified for the token', () => {
        it('should revert', async () => {
          const context = await loadFixture(deployFullSuiteWithTransferManager);

          await expect(
            context.suite.transferManager.connect(context.accounts.tokenAgent).modifyApprovalCriteria({
              tokenAddress: context.suite.token.address,
              includeRecipientApprover: false,
              includeAgentApprover: true,
              sequentialApproval: true,
              additionalApprovers: [],
            }),
          ).to.be.revertedWithCustomError(context.suite.transferManager, `DVAManagerIsNotVerifiedForTheToken`);
        });
      });

      describe('when DVA Manager is verified for the token', () => {
        it('should modify approval criteria', async () => {
          const context = await loadFixture(deployFullSuiteWithTransferManager);
          const identity = await context.suite.identityRegistry.identity(context.accounts.aliceWallet.address);
          await context.suite.identityRegistry
            .connect(context.accounts.tokenAgent)
            .registerIdentity(context.suite.transferManager.address, identity, 0);

          const tx = context.suite.transferManager.connect(context.accounts.tokenAgent).modifyApprovalCriteria({
            tokenAddress: context.suite.token.address,
            includeRecipientApprover: true,
            includeAgentApprover: true,
            sequentialApproval: true,
            additionalApprovers: [context.accounts.anotherWallet.address, context.accounts.bobWallet.address],
          });

          await expect(tx)
            .to.emit(context.suite.transferManager, 'ApprovalCriteriaModified')
            .withArgs(context.suite.token.address, true, true, true, [context.accounts.anotherWallet.address, context.accounts.bobWallet.address]);

          const approvalCriteria = await context.suite.transferManager.getApprovalCriteria(context.suite.token.address);
          expect(approvalCriteria.includeRecipientApprover).to.be.true;
          expect(approvalCriteria.includeAgentApprover).to.be.true;
          expect(approvalCriteria.sequentialApproval).to.be.true;
          expect(approvalCriteria.additionalApprovers).to.be.eql([context.accounts.anotherWallet.address, context.accounts.bobWallet.address]);
        });
      });
    });
  });

  describe('.initiateTransfer', () => {
    describe('when token is not registered to the DVA manager', () => {
      it('should revert', async () => {
        const context = await loadFixture(deployFullSuiteWithTransferManager);

        await expect(
          context.suite.transferManager
            .connect(context.accounts.aliceWallet)
            .initiateTransfer(context.suite.token.address, context.accounts.bobWallet.address, 10),
        ).to.be.revertedWithCustomError(context.suite.transferManager, `TokenIsNotRegistered`);
      });
    });

    describe('when token is registered to the DVA manager', () => {
      describe('when recipient is not verified for the token', () => {
        it('should revert', async () => {
          const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
          await context.suite.transferManager.connect(context.accounts.tokenAgent).modifyApprovalCriteria({
            tokenAddress: context.suite.token.address,
            includeRecipientApprover: true,
            includeAgentApprover: true,
            sequentialApproval: true,
            additionalApprovers: [context.accounts.charlieWallet.address, context.accounts.anotherWallet.address],
          });

          await expect(
            context.suite.transferManager
              .connect(context.accounts.aliceWallet)
              .initiateTransfer(context.suite.token.address, context.accounts.anotherWallet.address, 10),
          ).to.be.revertedWithCustomError(context.suite.transferManager, `RecipientIsNotVerified`);
        });
      });

      describe('when amount is higher than sender balance', () => {
        it('should revert', async () => {
          const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
          await context.suite.transferManager.connect(context.accounts.tokenAgent).modifyApprovalCriteria({
            tokenAddress: context.suite.token.address,
            includeRecipientApprover: true,
            includeAgentApprover: true,
            sequentialApproval: true,
            additionalApprovers: [context.accounts.charlieWallet.address, context.accounts.anotherWallet.address],
          });

          await context.suite.token.connect(context.accounts.aliceWallet).approve(context.suite.transferManager.address, 100000);

          await expect(
            context.suite.transferManager
              .connect(context.accounts.aliceWallet)
              .initiateTransfer(context.suite.token.address, context.accounts.bobWallet.address, 100000),
          ).to.be.revertedWith('Insufficient Balance');
        });
      });

      describe('when sender has enough balance', () => {
        describe('when includeRecipientApprover is true', () => {
          it('should initiate the transfer with recipient approver', async () => {
            const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
            await context.suite.transferManager.connect(context.accounts.tokenAgent).modifyApprovalCriteria({
              tokenAddress: context.suite.token.address,
              includeRecipientApprover: true,
              includeAgentApprover: false,
              sequentialApproval: true,
              additionalApprovers: [],
            });

            await context.suite.token.connect(context.accounts.aliceWallet).approve(context.suite.transferManager.address, 100000);
            const transferID = await context.suite.transferManager.calculateTransferID(
              0,
              context.accounts.aliceWallet.address,
              context.accounts.bobWallet.address,
              100,
            );

            const tx = context.suite.transferManager
              .connect(context.accounts.aliceWallet)
              .initiateTransfer(context.suite.token.address, context.accounts.bobWallet.address, 100);

            await expect(tx)
              .to.emit(context.suite.transferManager, 'TransferInitiated')
              .withArgs(transferID, context.suite.token.address, context.accounts.aliceWallet.address, context.accounts.bobWallet.address, 100, []);

            const result = await (await tx).wait();
            expect(result.events[2].args['approvers'].length).to.be.eq(1);
            expect(result.events[2].args['approvers'][0]['wallet']).to.be.eq(context.accounts.bobWallet.address);
            expect(result.events[2].args['approvers'][0]['approved']).to.be.false;
          });
        });

        describe('when includeAgentApprover is true', () => {
          it('should initiate the transfer with token agent approver', async () => {
            const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
            await context.suite.transferManager.connect(context.accounts.tokenAgent).modifyApprovalCriteria({
              tokenAddress: context.suite.token.address,
              includeRecipientApprover: false,
              includeAgentApprover: true,
              sequentialApproval: true,
              additionalApprovers: [],
            });

            await context.suite.token.connect(context.accounts.aliceWallet).approve(context.suite.transferManager.address, 100000);
            const transferID = await context.suite.transferManager.calculateTransferID(
              0,
              context.accounts.aliceWallet.address,
              context.accounts.bobWallet.address,
              100,
            );

            const tx = context.suite.transferManager
              .connect(context.accounts.aliceWallet)
              .initiateTransfer(context.suite.token.address, context.accounts.bobWallet.address, 100);

            await expect(tx)
              .to.emit(context.suite.transferManager, 'TransferInitiated')
              .withArgs(transferID, context.suite.token.address, context.accounts.aliceWallet.address, context.accounts.bobWallet.address, 100, []);

            const result = await (await tx).wait();
            expect(result.events[2].args['approvers'].length).to.be.eq(1);
            expect(result.events[2].args['approvers'][0]['wallet']).to.be.eq('0x0000000000000000000000000000000000000000');
            expect(result.events[2].args['approvers'][0]['approved']).to.be.false;
          });
        });

        describe('when additional approvers exist', () => {
          it('should initiate the transfer with token agent approver', async () => {
            const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
            await context.suite.transferManager.connect(context.accounts.tokenAgent).modifyApprovalCriteria({
              tokenAddress: context.suite.token.address,
              includeRecipientApprover: false,
              includeAgentApprover: false,
              sequentialApproval: true,
              additionalApprovers: [context.accounts.charlieWallet.address, context.accounts.anotherWallet.address],
            });

            await context.suite.token.connect(context.accounts.aliceWallet).approve(context.suite.transferManager.address, 100000);
            const transferID = await context.suite.transferManager.calculateTransferID(
              0,
              context.accounts.aliceWallet.address,
              context.accounts.bobWallet.address,
              100,
            );

            const tx = context.suite.transferManager
              .connect(context.accounts.aliceWallet)
              .initiateTransfer(context.suite.token.address, context.accounts.bobWallet.address, 100);

            await expect(tx)
              .to.emit(context.suite.transferManager, 'TransferInitiated')
              .withArgs(transferID, context.suite.token.address, context.accounts.aliceWallet.address, context.accounts.bobWallet.address, 100, []);

            const result = await (await tx).wait();
            expect(result.events[2].args['approvers'].length).to.be.eq(2);
            expect(result.events[2].args['approvers'][0]['wallet']).to.be.eq(context.accounts.charlieWallet.address);
            expect(result.events[2].args['approvers'][0]['approved']).to.be.false;
            expect(result.events[2].args['approvers'][1]['wallet']).to.be.eq(context.accounts.anotherWallet.address);
            expect(result.events[2].args['approvers'][1]['approved']).to.be.false;
          });
        });

        describe('when all criteria are enabled', () => {
          it('should initiate the transfer with all approvers', async () => {
            const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
            await context.suite.transferManager.connect(context.accounts.tokenAgent).modifyApprovalCriteria({
              tokenAddress: context.suite.token.address,
              includeRecipientApprover: true,
              includeAgentApprover: true,
              sequentialApproval: true,
              additionalApprovers: [context.accounts.charlieWallet.address, context.accounts.anotherWallet.address],
            });

            await context.suite.token.connect(context.accounts.aliceWallet).approve(context.suite.transferManager.address, 100000);
            const transferID = await context.suite.transferManager.calculateTransferID(
              0,
              context.accounts.aliceWallet.address,
              context.accounts.bobWallet.address,
              100,
            );

            const tx = context.suite.transferManager
              .connect(context.accounts.aliceWallet)
              .initiateTransfer(context.suite.token.address, context.accounts.bobWallet.address, 100);

            await expect(tx)
              .to.emit(context.suite.transferManager, 'TransferInitiated')
              .withArgs(transferID, context.suite.token.address, context.accounts.aliceWallet.address, context.accounts.bobWallet.address, 100, []);

            const result = await (await tx).wait();
            expect(result.events[2].args['approvers'].length).to.be.eq(4);
            expect(result.events[2].args['approvers'][0]['wallet']).to.be.eq(context.accounts.bobWallet.address);
            expect(result.events[2].args['approvers'][0]['approved']).to.be.false;
            expect(result.events[2].args['approvers'][1]['wallet']).to.be.eq('0x0000000000000000000000000000000000000000');
            expect(result.events[2].args['approvers'][1]['approved']).to.be.false;
            expect(result.events[2].args['approvers'][2]['wallet']).to.be.eq(context.accounts.charlieWallet.address);
            expect(result.events[2].args['approvers'][2]['approved']).to.be.false;
            expect(result.events[2].args['approvers'][3]['wallet']).to.be.eq(context.accounts.anotherWallet.address);
            expect(result.events[2].args['approvers'][3]['approved']).to.be.false;

            const senderBalance = await context.suite.token.balanceOf(context.accounts.aliceWallet.address);
            expect(senderBalance).to.be.eq(900);

            const dvaBalance = await context.suite.token.balanceOf(context.suite.transferManager.address);
            expect(dvaBalance).to.be.eq(100);
          });
        });
      });
    });
  });

  describe('.approveTransfer', () => {
    describe('when transfer does not exist', () => {
      it('should revert', async () => {
        const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
        const transferID = await context.suite.transferManager.calculateTransferID(
          0,
          context.accounts.aliceWallet.address,
          context.accounts.bobWallet.address,
          100,
        );

        await expect(context.suite.transferManager.approveTransfer(transferID)).to.be.revertedWithCustomError(
          context.suite.transferManager,
          `InvalidTransferID`,
        );
      });
    });

    describe('when transfer status is not pending', () => {
      it('should revert', async () => {
        const context = await loadFixture(deployFullSuiteWithNonSequentialTransfer);
        await context.suite.transferManager.connect(context.accounts.aliceWallet).cancelTransfer(context.transferID);

        await expect(context.suite.transferManager.approveTransfer(context.transferID)).to.be.revertedWithCustomError(
          context.suite.transferManager,
          `TransferIsNotInPendingStatus`,
        );
      });
    });

    describe('when sequential approval is disabled', () => {
      describe('when caller is not an approver', () => {
        it('should revert', async () => {
          const context = await loadFixture(deployFullSuiteWithNonSequentialTransfer);
          await expect(context.suite.transferManager.approveTransfer(context.transferID)).to.be.revertedWithCustomError(
            context.suite.transferManager,
            `ApproverNotFound`,
          );
        });
      });

      describe('when caller is the last approver', () => {
        it('should approve', async () => {
          const context = await loadFixture(deployFullSuiteWithNonSequentialTransfer);
          const tx = context.suite.transferManager.connect(context.accounts.charlieWallet).approveTransfer(context.transferID);
          await expect(tx)
            .to.emit(context.suite.transferManager, 'TransferApproved')
            .withArgs(context.transferID, context.accounts.charlieWallet.address);
        });
      });

      describe('when all parties approve the transfer', () => {
        it('should complete', async () => {
          const context = await loadFixture(deployFullSuiteWithNonSequentialTransfer);

          await context.suite.transferManager.connect(context.accounts.tokenAgent).approveTransfer(context.transferID);
          await context.suite.transferManager.connect(context.accounts.bobWallet).approveTransfer(context.transferID);
          const tx = context.suite.transferManager.connect(context.accounts.charlieWallet).approveTransfer(context.transferID);

          await expect(tx)
            .to.emit(context.suite.transferManager, 'TransferApproved')
            .withArgs(context.transferID, context.accounts.charlieWallet.address);

          await expect(tx)
            .to.emit(context.suite.transferManager, 'TransferCompleted')
            .withArgs(context.transferID, context.suite.token.address, context.accounts.aliceWallet.address, context.accounts.bobWallet.address, 100);

          const transfer = await context.suite.transferManager.getTransfer(context.transferID);
          expect(transfer.status).to.be.eq(1);

          const senderBalance = await context.suite.token.balanceOf(context.accounts.aliceWallet.address);
          expect(senderBalance).to.be.eq(900);

          const receiverBalance = await context.suite.token.balanceOf(context.accounts.bobWallet.address);
          expect(receiverBalance).to.be.eq(600);

          const dvaBalance = await context.suite.token.balanceOf(context.suite.transferManager.address);
          expect(dvaBalance).to.be.eq(0);
        });
      });
    });

    describe('when sequential approval is enabled', () => {
      describe('when caller is not the next approver', () => {
        it('should revert', async () => {
          const context = await loadFixture(deployFullSuiteWithSequentialTransfer);
          await expect(
            context.suite.transferManager.connect(context.accounts.charlieWallet).approveTransfer(context.transferID),
          ).to.be.revertedWithCustomError(context.suite.transferManager, `ApprovalsMustBeSequential`);
        });
      });

      describe('when caller is the next approver and it is a token agent', () => {
        it('should approve', async () => {
          const context = await loadFixture(deployFullSuiteWithSequentialTransfer);
          await context.suite.transferManager.connect(context.accounts.bobWallet).approveTransfer(context.transferID);
          const tx = context.suite.transferManager.connect(context.accounts.tokenAgent).approveTransfer(context.transferID);

          await expect(tx)
            .to.emit(context.suite.transferManager, 'TransferApproved')
            .withArgs(context.transferID, context.accounts.tokenAgent.address);
        });
      });

      describe('when all parties approve the transfer', () => {
        it('should complete', async () => {
          const context = await loadFixture(deployFullSuiteWithSequentialTransfer);

          await context.suite.transferManager.connect(context.accounts.bobWallet).approveTransfer(context.transferID);
          await context.suite.transferManager.connect(context.accounts.tokenAgent).approveTransfer(context.transferID);
          const tx = context.suite.transferManager.connect(context.accounts.charlieWallet).approveTransfer(context.transferID);

          await expect(tx)
            .to.emit(context.suite.transferManager, 'TransferApproved')
            .withArgs(context.transferID, context.accounts.charlieWallet.address);

          await expect(tx)
            .to.emit(context.suite.transferManager, 'TransferCompleted')
            .withArgs(context.transferID, context.suite.token.address, context.accounts.aliceWallet.address, context.accounts.bobWallet.address, 100);

          const transfer = await context.suite.transferManager.getTransfer(context.transferID);
          expect(transfer.status).to.be.eq(1);

          const senderBalance = await context.suite.token.balanceOf(context.accounts.aliceWallet.address);
          expect(senderBalance).to.be.eq(900);

          const receiverBalance = await context.suite.token.balanceOf(context.accounts.bobWallet.address);
          expect(receiverBalance).to.be.eq(600);

          const dvaBalance = await context.suite.token.balanceOf(context.suite.transferManager.address);
          expect(dvaBalance).to.be.eq(0);
        });
      });
    });
  });

  describe('.cancelTransfer', () => {
    describe('when transfer does not exist', () => {
      it('should revert', async () => {
        const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
        const transferID = await context.suite.transferManager.calculateTransferID(
          0,
          context.accounts.aliceWallet.address,
          context.accounts.bobWallet.address,
          100,
        );

        await expect(context.suite.transferManager.cancelTransfer(transferID)).to.be.revertedWithCustomError(
          context.suite.transferManager,
          `InvalidTransferID`,
        );
      });
    });

    describe('when caller is not sender', () => {
      it('should revert', async () => {
        const context = await loadFixture(deployFullSuiteWithNonSequentialTransfer);
        await expect(
          context.suite.transferManager.connect(context.accounts.bobWallet).cancelTransfer(context.transferID),
        ).to.be.revertedWithCustomError(context.suite.transferManager, `OnlyTransferSenderCanCall`);
      });
    });

    describe('when transfer status is not pending', () => {
      it('should revert', async () => {
        const context = await loadFixture(deployFullSuiteWithNonSequentialTransfer);
        await context.suite.transferManager.connect(context.accounts.aliceWallet).cancelTransfer(context.transferID);

        await expect(
          context.suite.transferManager.connect(context.accounts.aliceWallet).cancelTransfer(context.transferID),
        ).to.be.revertedWithCustomError(context.suite.transferManager, `TransferIsNotInPendingStatus`);
      });
    });

    describe('when transfer status is pending', () => {
      it('should cancel', async () => {
        const context = await loadFixture(deployFullSuiteWithNonSequentialTransfer);

        const tx = await context.suite.transferManager.connect(context.accounts.aliceWallet).cancelTransfer(context.transferID);
        await expect(tx).to.emit(context.suite.transferManager, 'TransferCancelled').withArgs(context.transferID);

        const transfer = await context.suite.transferManager.getTransfer(context.transferID);
        expect(transfer.status).to.be.eq(2);

        const senderBalance = await context.suite.token.balanceOf(context.accounts.aliceWallet.address);
        expect(senderBalance).to.be.eq(1000);
      });
    });
  });

  describe('.rejectTransfer', () => {
    describe('when transfer does not exist', () => {
      it('should revert', async () => {
        const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
        const transferID = await context.suite.transferManager.calculateTransferID(
          0,
          context.accounts.aliceWallet.address,
          context.accounts.bobWallet.address,
          100,
        );

        await expect(context.suite.transferManager.rejectTransfer(transferID)).to.be.revertedWithCustomError(
          context.suite.transferManager,
          `InvalidTransferID`,
        );
      });
    });

    describe('when transfer status is not pending', () => {
      it('should revert', async () => {
        const context = await loadFixture(deployFullSuiteWithNonSequentialTransfer);
        await context.suite.transferManager.connect(context.accounts.aliceWallet).cancelTransfer(context.transferID);

        await expect(context.suite.transferManager.rejectTransfer(context.transferID)).to.be.revertedWithCustomError(
          context.suite.transferManager,
          `TransferIsNotInPendingStatus`,
        );
      });
    });

    describe('when sequential approval is disabled', () => {
      describe('when caller is not an approver', () => {
        it('should revert', async () => {
          const context = await loadFixture(deployFullSuiteWithNonSequentialTransfer);
          await expect(context.suite.transferManager.rejectTransfer(context.transferID)).to.be.revertedWithCustomError(
            context.suite.transferManager,
            `ApproverNotFound`,
          );
        });
      });

      describe('when caller is the last approver', () => {
        it('should reject', async () => {
          const context = await loadFixture(deployFullSuiteWithNonSequentialTransfer);
          const tx = context.suite.transferManager.connect(context.accounts.charlieWallet).rejectTransfer(context.transferID);
          await expect(tx)
            .to.emit(context.suite.transferManager, 'TransferRejected')
            .withArgs(context.transferID, context.accounts.charlieWallet.address);

          const transfer = await context.suite.transferManager.getTransfer(context.transferID);
          expect(transfer.status).to.be.eq(3);

          const senderBalance = await context.suite.token.balanceOf(context.accounts.aliceWallet.address);
          expect(senderBalance).to.be.eq(1000);
        });
      });
    });

    describe('when sequential approval is enabled', () => {
      describe('when caller is not the next approver', () => {
        it('should revert', async () => {
          const context = await loadFixture(deployFullSuiteWithSequentialTransfer);
          await expect(
            context.suite.transferManager.connect(context.accounts.charlieWallet).rejectTransfer(context.transferID),
          ).to.be.revertedWithCustomError(context.suite.transferManager, `ApprovalsMustBeSequential`);
        });
      });

      describe('when caller is the next approver and it is a token agent', () => {
        it('should reject', async () => {
          const context = await loadFixture(deployFullSuiteWithSequentialTransfer);
          await context.suite.transferManager.connect(context.accounts.bobWallet).approveTransfer(context.transferID);
          const tx = context.suite.transferManager.connect(context.accounts.tokenAgent).rejectTransfer(context.transferID);

          await expect(tx)
            .to.emit(context.suite.transferManager, 'TransferRejected')
            .withArgs(context.transferID, context.accounts.tokenAgent.address);

          const transfer = await context.suite.transferManager.getTransfer(context.transferID);
          expect(transfer.status).to.be.eq(3);

          const senderBalance = await context.suite.token.balanceOf(context.accounts.aliceWallet.address);
          expect(senderBalance).to.be.eq(1000);
        });
      });
    });
  });

  describe('.getTransfer', () => {
    describe('when transfer does not exist', () => {
      it('should revert', async () => {
        const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
        const transferID = await context.suite.transferManager.calculateTransferID(
          0,
          context.accounts.aliceWallet.address,
          context.accounts.bobWallet.address,
          100,
        );

        await expect(context.suite.transferManager.getTransfer(transferID)).to.be.revertedWithCustomError(
          context.suite.transferManager,
          `InvalidTransferID`,
        );
      });
    });

    describe('when transfer exists', () => {
      it('should return transfer', async () => {
        const context = await loadFixture(deployFullSuiteWithNonSequentialTransfer);

        const transfer = await context.suite.transferManager.getTransfer(context.transferID);
        expect(transfer.tokenAddress).to.be.eq(context.suite.token.address);
        expect(transfer.sender).to.be.eq(context.accounts.aliceWallet.address);
        expect(transfer.recipient).to.be.eq(context.accounts.bobWallet.address);
        expect(transfer.amount).to.be.eq(100);
        expect(transfer.status).to.be.eq(0);
        expect(transfer.approvers.length).to.be.eq(3);
        expect(transfer.approvers[0].wallet).to.be.eq(context.accounts.bobWallet.address);
        expect(transfer.approvers[0].approved).to.be.false;
        expect(transfer.approvers[1].wallet).to.be.eq('0x0000000000000000000000000000000000000000');
        expect(transfer.approvers[1].approved).to.be.false;
        expect(transfer.approvers[2].wallet).to.be.eq(context.accounts.charlieWallet.address);
        expect(transfer.approvers[2].approved).to.be.false;
      });
    });
  });

  describe('.getNextTxNonce', () => {
    describe('when there is no transfer', () => {
      it('should return zero', async () => {
        const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
        const nonce = await context.suite.transferManager.getNextTxNonce();
        expect(nonce).to.be.eq(0);
      });
    });

    describe('when one transfer exists', () => {
      it('should return one', async () => {
        const context = await loadFixture(deployFullSuiteWithNonSequentialTransfer);
        const nonce = await context.suite.transferManager.getNextTxNonce();
        expect(nonce).to.be.eq(1);
      });
    });
  });

  describe('.getNextApprover', () => {
    describe('when transfer does not exist', () => {
      it('should revert', async () => {
        const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
        const transferID = await context.suite.transferManager.calculateTransferID(
          0,
          context.accounts.aliceWallet.address,
          context.accounts.bobWallet.address,
          100,
        );

        await expect(context.suite.transferManager.getNextApprover(transferID)).to.be.revertedWithCustomError(
          context.suite.transferManager,
          `InvalidTransferID`,
        );
      });
    });

    describe('when transfer status is not pending', () => {
      it('should revert', async () => {
        const context = await loadFixture(deployFullSuiteWithNonSequentialTransfer);
        await context.suite.transferManager.connect(context.accounts.aliceWallet).cancelTransfer(context.transferID);

        await expect(
          context.suite.transferManager.connect(context.accounts.aliceWallet).getNextApprover(context.transferID),
        ).to.be.revertedWithCustomError(context.suite.transferManager, `TransferIsNotInPendingStatus`);
      });
    });

    describe('when no one approved the transfer', () => {
      it('should return first approver', async () => {
        const context = await loadFixture(deployFullSuiteWithSequentialTransfer);
        const nextApprover = await context.suite.transferManager.getNextApprover(context.transferID);
        expect(nextApprover).to.be.eq(context.accounts.bobWallet.address);
      });
    });

    describe('when one approver approved the transfer', () => {
      it('should return second approver (token agent)', async () => {
        const context = await loadFixture(deployFullSuiteWithSequentialTransfer);
        await context.suite.transferManager.connect(context.accounts.bobWallet).approveTransfer(context.transferID);
        const nextApprover = await context.suite.transferManager.getNextApprover(context.transferID);
        expect(nextApprover).to.be.eq('0x0000000000000000000000000000000000000000');
      });
    });
  });

  describe('.getApprovalCriteria', () => {
    describe('when token is not registered', () => {
      it('should revert', async () => {
        const context = await loadFixture(deployFullSuiteWithVerifiedTransferManager);
        await expect(context.suite.transferManager.getApprovalCriteria(context.suite.token.address)).to.be.revertedWithCustomError(
          context.suite.transferManager,
          `TokenIsNotRegistered`,
        );
      });
    });

    describe('when token is registered', () => {
      it('should return criteria', async () => {
        const context = await loadFixture(deployFullSuiteWithSequentialTransfer);
        const approvalCriteria = await context.suite.transferManager.getApprovalCriteria(context.suite.token.address);
        expect(approvalCriteria.tokenAddress).to.be.eq(context.suite.token.address);
        expect(approvalCriteria.includeRecipientApprover).to.be.true;
        expect(approvalCriteria.includeAgentApprover).to.be.true;
        expect(approvalCriteria.sequentialApproval).to.be.true;
        expect(approvalCriteria.additionalApprovers).to.be.eql([context.accounts.charlieWallet.address]);
      });
    });
  });
});
