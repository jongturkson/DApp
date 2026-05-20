import { expect } from "chai";
import { ethers } from "hardhat";

describe("Land Registration System", function () {
  let landNFT: any;
  let landRegistry: any;
  let owner: any;
  let registrar: any;
  let citizen: any;
  let landowner1: any;
  let landowner2: any;

  beforeEach(async function () {
    [owner, registrar, citizen, landowner1, landowner2] = await ethers.getSigners();

    // Deploy LandNFT — now takes initialOwner as constructor arg
    const LandNFT = await ethers.getContractFactory("LandNFT");
    landNFT = await LandNFT.deploy(owner.address);

    // Deploy LandRegistry
    const LandRegistry = await ethers.getContractFactory("LandRegistry");
    landRegistry = await LandRegistry.deploy(await landNFT.getAddress());

    // Link the two contracts — now called setRegistryAddress
    await landNFT.connect(owner).setRegistryAddress(await landRegistry.getAddress());
  });

  // ---- DEPLOYMENT & ACCESS CONTROL ----
  describe("Deployment & Access Control", function () {
    it("Should grant the deployer the ADMIN_ROLE", async function () {
      const adminRole = await landRegistry.ADMIN_ROLE();
      expect(await landRegistry.hasRole(adminRole, owner.address)).to.be.true;
    });

    it("Should allow Admin to add a new Registrar", async function () {
      await landRegistry.connect(owner).addRegistrar(registrar.address);
      expect(await landRegistry.isRegistrar(registrar.address)).to.be.true;
    });

    it("Should block a regular citizen from adding a Registrar", async function () {
      await expect(
        landRegistry.connect(citizen).addRegistrar(citizen.address)
      ).to.be.revertedWith("Caller is not an admin");
    });

    it("Should allow Admin to remove a Registrar", async function () {
      await landRegistry.connect(owner).addRegistrar(registrar.address);
      await landRegistry.connect(owner).removeRegistrar(registrar.address);
      expect(await landRegistry.isRegistrar(registrar.address)).to.be.false;
    });
  });

  // ---- LAND REGISTRATION ----
  describe("Land Registration", function () {
    beforeEach(async function () {
      // Add registrar before each registration test
      await landRegistry.connect(owner).addRegistrar(registrar.address);
    });

    it("Should allow a Registrar to register a land parcel", async function () {
      await landRegistry.connect(registrar).registerLand(
        landowner1.address,
        "Plot 12, Avenue du 20 Mai, Yaoundé",
        500,
        "QmTestHashABC123"
      );
      const parcel = await landRegistry.getParcelDetails(1);
      expect(parcel.owner).to.equal(landowner1.address);
      expect(parcel.location).to.equal("Plot 12, Avenue du 20 Mai, Yaoundé");
      expect(parcel.area).to.equal(500n);
      expect(parcel.isRegistered).to.be.true;
    });

    it("Should mint an NFT to the landowner on registration", async function () {
      await landRegistry.connect(registrar).registerLand(
        landowner1.address, "Douala Port Plot", 300, "QmNFTHash"
      );
      expect(await landNFT.ownerOf(1)).to.equal(landowner1.address);
    });

    it("Should block a citizen from registering land", async function () {
      await expect(
        landRegistry.connect(citizen).registerLand(
          landowner1.address, "Some Location", 200, "QmHash"
        )
      ).to.be.revertedWith("Caller is not a registrar");
    });

    it("Should revert if area is zero", async function () {
      await expect(
        landRegistry.connect(registrar).registerLand(
          landowner1.address, "Location", 0, "QmHash"
        )
      ).to.be.revertedWith("Area must be greater than 0");
    });
  });

  // ---- OWNERSHIP TRANSFER ----
  describe("Ownership Transfer", function () {
    beforeEach(async function () {
      await landRegistry.connect(owner).addRegistrar(registrar.address);
      await landRegistry.connect(registrar).registerLand(
        landowner1.address, "Plot 5, Bamenda", 750, "QmTransferHash"
      );
      // Landowner must approve the registry contract to move their NFT
      await landNFT.connect(landowner1).setApprovalForAll(
        await landRegistry.getAddress(), true
      );
    });

    it("Should allow the owner to transfer their parcel", async function () {
      await landRegistry.connect(landowner1).transferOwnership(1, landowner2.address);
      const parcel = await landRegistry.getParcelDetails(1);
      expect(parcel.owner).to.equal(landowner2.address);
    });

    it("Should transfer the NFT to the new owner", async function () {
      await landRegistry.connect(landowner1).transferOwnership(1, landowner2.address);
      expect(await landNFT.ownerOf(1)).to.equal(landowner2.address);
    });

    it("Should block a non-owner from transferring", async function () {
      await expect(
        landRegistry.connect(citizen).transferOwnership(1, landowner2.address)
      ).to.be.revertedWith("Only owner can transfer");
    });

    it("Should record the full ownership history", async function () {
      await landRegistry.connect(landowner1).transferOwnership(1, landowner2.address);
      const history = await landRegistry.getOwnershipHistory(1);
      expect(history[0]).to.equal(landowner1.address);
      expect(history[1]).to.equal(landowner2.address);
    });
  });

  // ---- OWNERSHIP VERIFICATION ----
  describe("Ownership Verification", function () {
    beforeEach(async function () {
      await landRegistry.connect(owner).addRegistrar(registrar.address);
      await landRegistry.connect(registrar).registerLand(
        landowner1.address, "Limbe Beach Plot", 1000, "QmVerifyHash"
      );
    });

    it("Should return the correct owner for a registered parcel", async function () {
      const [ownerAddr] = await landRegistry.verifyOwnership(1);
      expect(ownerAddr).to.equal(landowner1.address);
    });

    it("Should revert when verifying a non-existent parcel", async function () {
      await expect(
        landRegistry.verifyOwnership(999)
      ).to.be.revertedWith("Parcel does not exist");
    });

    it("Should return all parcels owned by an address", async function () {
      await landRegistry.connect(registrar).registerLand(
        landowner1.address, "Plot B", 300, "QmHashB"
      );
      const parcelIds = await landRegistry.getParcelsByOwner(landowner1.address);
      expect(parcelIds.length).to.equal(2);
    });
  });
});