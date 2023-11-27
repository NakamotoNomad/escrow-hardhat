const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('Escrow', function () {
  let contract;
  let depositor;
  let beneficiary;
  let arbiter;
  const deposit = ethers.utils.parseEther('1');

  async function setupContract(depositAmount) {
    const Escrow = await ethers.getContractFactory('Escrow');
    const contract = await Escrow.deploy(
        arbiter.getAddress(),
        beneficiary.getAddress(),
        { value: depositAmount }
    );
    await contract.deployed();
    return contract;
  }

  beforeEach(async () => {
    depositor = ethers.provider.getSigner(0);
    beneficiary = ethers.provider.getSigner(1);
    arbiter = ethers.provider.getSigner(2);
    contract = await setupContract(deposit);
  });

  it('should be funded initially', async function () {
    let balance = await ethers.provider.getBalance(contract.address);
    expect(balance).to.eq(deposit);
  });

  describe('after approval from address other than the arbiter', () => {
    it('should revert', async () => {
      await expect(contract.connect(beneficiary).approve()).to.be.reverted;
    });
  });

  describe('after denial from address other than the arbiter', () => {
    it('should revert', async () => {
      await expect(contract.connect(beneficiary).deny()).to.be.reverted;
    });
  });

  describe('after approval from the arbiter', () => {
    it('should transfer balance to beneficiary', async () => {
      const beforeBalanceBeneficiary = await ethers.provider.getBalance(beneficiary.getAddress());
      const beforeBalanceArbiter = await ethers.provider.getBalance(arbiter.getAddress());
      const approveTxn = await contract.connect(arbiter).approve();
      await approveTxn.wait();
      const afterBalanceBeneficiary = await ethers.provider.getBalance(beneficiary.getAddress());
      const afterBalanceArbiter = await ethers.provider.getBalance(arbiter.getAddress());

      expect(afterBalanceBeneficiary.sub(beforeBalanceBeneficiary)).to.eq(ethers.utils.parseEther('0.95'));

      // check the arbiter got their cut. However, as they had to pay gas it'll be slightly less than 0.05
      expect(afterBalanceArbiter.sub(beforeBalanceArbiter)).to.lt(ethers.utils.parseEther('0.05'));
      expect(afterBalanceArbiter.sub(beforeBalanceArbiter)).to.gt(ethers.utils.parseEther('0.04'));
    });

    it('should only transfer a maximum of 0.1 ETH to the arbiter', async () => {
      const largeDepositContract = await setupContract(ethers.utils.parseEther("100"));
      const beforeBalanceBeneficiary = await ethers.provider.getBalance(beneficiary.getAddress());
      const beforeBalanceArbiter = await ethers.provider.getBalance(arbiter.getAddress());
      const approveTxn = await largeDepositContract.connect(arbiter).approve();
      await approveTxn.wait();
      const afterBalanceBeneficiary = await ethers.provider.getBalance(beneficiary.getAddress());
      const afterBalanceArbiter = await ethers.provider.getBalance(arbiter.getAddress());

      expect(afterBalanceBeneficiary.sub(beforeBalanceBeneficiary)).to.eq(ethers.utils.parseEther('99.9'));

      // the arbiter shouldn't get 5% of the 100 ETH but instead the max cap of 0.1 ETH
      expect(afterBalanceArbiter.sub(beforeBalanceArbiter)).to.lt(ethers.utils.parseEther('0.1'));
      expect(afterBalanceArbiter.sub(beforeBalanceArbiter)).to.gt(ethers.utils.parseEther('0.09'));
    });

    it('should always transfer at least 0.001 ETH to the arbiter', async () => {
      const smallDepositContract = await setupContract(ethers.utils.parseEther("0.01"));
      const beforeBalanceBeneficiary = await ethers.provider.getBalance(beneficiary.getAddress());
      const beforeBalanceArbiter = await ethers.provider.getBalance(arbiter.getAddress());
      const approveTxn = await smallDepositContract.connect(arbiter).approve();
      await approveTxn.wait();
      const afterBalanceBeneficiary = await ethers.provider.getBalance(beneficiary.getAddress());
      const afterBalanceArbiter = await ethers.provider.getBalance(arbiter.getAddress());

      expect(afterBalanceBeneficiary.sub(beforeBalanceBeneficiary)).to.eq(ethers.utils.parseEther('0.009'));

      // the arbiter shouldn't get only 5% of the 0.01 ETH but instead the min cap of 0.001 ETH
      expect(afterBalanceArbiter.sub(beforeBalanceArbiter)).to.lt(ethers.utils.parseEther('0.001'));
      expect(afterBalanceArbiter.sub(beforeBalanceArbiter)).to.gt(ethers.utils.parseEther('0.0009'));
    });
  });

  describe('after denial from the arbiter', () => {
    it('should transfer balance to depositor', async () => {
      const beforeBalanceDepositor = await ethers.provider.getBalance(depositor.getAddress());
      const beforeBalanceArbiter = await ethers.provider.getBalance(arbiter.getAddress());
      const approveTxn = await contract.connect(arbiter).deny();
      await approveTxn.wait();
      const afterBalanceDepositor = await ethers.provider.getBalance(depositor.getAddress());
      const afterBalanceArbiter = await ethers.provider.getBalance(arbiter.getAddress());

      expect(afterBalanceDepositor.sub(beforeBalanceDepositor)).to.eq(ethers.utils.parseEther('0.95'));

      // check the arbiter got their cut. However, as they had to pay gas it'll be slightly less than 0.05
      expect(afterBalanceArbiter.sub(beforeBalanceArbiter)).to.lt(ethers.utils.parseEther('0.05'));
      expect(afterBalanceArbiter.sub(beforeBalanceArbiter)).to.gt(ethers.utils.parseEther('0.04'));
    });
  });
});
