import { ethers } from "hardhat";

/**
 * Post-deployment setup script for localhost.
 * 
 * After deploying via Hardhat Ignition, run this script to:
 * 1. Link LandNFT → LandRegistry (setRegistryAddress)
 * 2. Print the addresses you need to paste into Web3Context.tsx
 * 
 * Usage:
 *   npx hardhat run scripts/setup-local.ts --network localhost
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Running setup with deployer:", deployer.address);

    // ──────────────────────────────────────────────────────────
    // UPDATE THESE with the addresses printed by Hardhat Ignition
    // ──────────────────────────────────────────────────────────
    const LAND_NFT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const LAND_REGISTRY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    // ──────────────────────────────────────────────────────────

    // 1. Get deployed LandNFT instance
    const landNFT = await ethers.getContractAt("LandNFT", LAND_NFT_ADDRESS);

    // 2. Call setRegistryAddress so LandRegistry can mint NFTs
    const currentRegistry = await landNFT.landRegistryAddress();
    if (currentRegistry === ethers.ZeroAddress) {
        console.log("Setting LandRegistry address on LandNFT...");
        const tx = await landNFT.setRegistryAddress(LAND_REGISTRY_ADDRESS);
        await tx.wait();
        console.log("✅ LandNFT now points to LandRegistry:", LAND_REGISTRY_ADDRESS);
    } else {
        console.log("⚠️  Registry address already set to:", currentRegistry);
    }

    // 3. Print addresses for the frontend
    console.log("\n─────────────────────────────────────────────");
    console.log("Paste these into frontend/src/context/Web3Context.tsx:");
    console.log(`const LAND_REGISTRY_ADDRESS = "${LAND_REGISTRY_ADDRESS}";`);
    console.log(`const LAND_NFT_ADDRESS = "${LAND_NFT_ADDRESS}";`);
    console.log("─────────────────────────────────────────────\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
