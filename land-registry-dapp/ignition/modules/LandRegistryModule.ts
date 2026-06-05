import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LandRegistryModule", (m) => {
  // Get the deployer account to use as the initial owner
  const deployer = m.getAccount(0);

  // 1. Deploy LandNFT with deployer as initialOwner (required by Ownable)
  const landNFT = m.contract("LandNFT", [deployer]);

  // 2. Deploy LandRegistry, passing the deployed LandNFT address
  const landRegistry = m.contract("LandRegistry", [landNFT]);

  // 3. Link LandNFT → LandRegistry so it can mint tokens
  m.call(landNFT, "setRegistryAddress", [landRegistry]);

  // 4. Return both so Hardhat tracks them
  return { landNFT, landRegistry };
});