const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VoidTx Contract", function () {
  let voidTx;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    const VoidTx = await ethers.getContractFactory("VoidTx");
    voidTx = await VoidTx.deploy();
    await voidTx.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await voidTx.getAddress()).to.be.properAddress;
    });

    it("Should set the right owner", async function () {
      expect(await voidTx.owner()).to.equal(owner.address);
    });
  });

  describe("Batch Payments", function () {
    it("Should process batch payments correctly", async function () {
      const payments = [
        { recipient: addr1.address, amount: ethers.parseEther("1.0") },
        { recipient: addr2.address, amount: ethers.parseEther("2.0") }
      ];

      const totalAmount = ethers.parseEther("3.0");
      await expect(voidTx.batchPay(payments, { value: totalAmount }))
        .to.emit(voidTx, "BatchPaymentInitiated")
        .withArgs(owner.address, 2, totalAmount);
    });
  });
});