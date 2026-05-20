// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Upgraded import to support storing the IPFS document links
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LandNFT is ERC721URIStorage, Ownable {
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
    /// @param initialOwner The address that will control administrative functions
    constructor(address initialOwner) ERC721("CameroonLandTitle", "CLT") Ownable(initialOwner) {}

    /// @notice Links this NFT contract to the main LandRegistry contract
    function setRegistryAddress(address _registry) external onlyOwner {
        if (_registry == address(0)) revert ZeroAddressNotAllowed();
        if (landRegistryAddress != address(0)) revert RegistryAlreadySet();
        landRegistryAddress = _registry;
    }

    /// @notice Mints a unique land title NFT and attaches the IPFS document
    /// @dev Now accepts 3 arguments to match LandRegistry.sol
    /// @param to The wallet address of the land parcel buyer/owner
    /// @param tokenId The unique Parcel ID representing the piece of land
    /// @param uri The IPFS link (CID) containing the actual land documents
    function mintLandToken(address to, uint256 tokenId, string memory uri) external onlyRegistry {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri); // Binds the IPFS document to the token permanently
    }
}