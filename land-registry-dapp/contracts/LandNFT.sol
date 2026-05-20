// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Import the official OpenZeppelin ERC-721 standard implementation
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LandNFT is ERC721, Ownable {
    // State variable to store the authorized LandRegistry contract address
    address public landRegistryAddress;

    // Custom errors for gas efficiency
    error OnlyRegistryCanMint();
    error RegistryAlreadySet();
    error ZeroAddressNotAllowed();

    // Modifier to restrict functions exclusively to the LandRegistry contract
    modifier onlyRegistry() {
        if (msg.sender != landRegistryAddress) revert OnlyRegistryCanMint();
        _;
    }

    /// @notice Initializes the NFT contract with a collection name and symbol
    /// @param initialOwner The address that will control administrative functions (the Government Admin)
    constructor(address initialOwner) ERC721("CameroonLandTitle", "CLT") Ownable(initialOwner) {}

    /// @notice Links this NFT contract to the main LandRegistry contract
    /// @dev Can only be called once by the contract Admin to prevent hijacking
    /// @param _registry The deployed address of LandRegistry.sol
    function setRegistryAddress(address _registry) external onlyOwner {
        if (_registry == address(0)) revert ZeroAddressNotAllowed();
        if (landRegistryAddress != address(0)) revert RegistryAlreadySet();
        landRegistryAddress = _registry;
    }

    /// @notice Mints a unique land title NFT to a specific citizen
    /// @dev Accessible only by the main LandRegistry contract logic
    /// @param to The wallet address of the land parcel buyer/owner
    /// @param tokenId The unique Parcel ID representing the piece of land
    function mintLandToken(address to, uint256 tokenId) external onlyRegistry {
        _safeMint(to, tokenId);
    }
}