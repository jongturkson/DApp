// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Define an interface so LandRegistry knows how to talk to LandNFT
interface ILandNFT {
    function mintLandToken(address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
}

contract LandRegistry {
    // 1. Core Data Structure matching your exact specifications
    struct LandParcel {
        uint256 parcelId;
        address owner;
        string location;
        uint256 area; // in square meters
        string documentHash; // IPFS CID
        bool isRegistered;
        uint256 registeredAt; // Block timestamp
    }

    // 2. State Variables
    address public admin; // Government Authority
    ILandNFT public landNFTContract; // Instance of the NFT contract

    // Mappings for lookup tables
    mapping(address => bool) public registrars; // Registrar Role Tracker
    mapping(uint256 => LandParcel) public registry; // Main Land Records Database

    // 3. Custom Errors for Roles & Business Rules
    error OnlyAdmin();
    error OnlyRegistrar();
    error OnlyParcelOwner();
    error ParcelAlreadyExists(uint256 parcelId);
    error ParcelDoesNotExist(uint256 parcelId);

    // 4. Events for Frontend Tracking
    event RegistrarAdded(address indexed registrar);
    event RegistrarRemoved(address indexed registrar);
    event LandRegistered(uint256 indexed parcelId, address indexed owner, string location);
    event LandTransferred(uint256 indexed parcelId, address indexed from, address indexed to);

    // 5. Access Control Modifiers
    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    modifier onlyRegistrar() {
        if (!registrars[msg.sender] && msg.sender != admin) revert OnlyRegistrar();
        _;
    }

    // 6. Constructor
    /// @param _nftAddress The deployed address of the LandNFT contract
    constructor(address _nftAddress) {
        admin = msg.sender; // The deployer becomes the Government Admin
        landNFTContract = ILandNFT(_nftAddress);
    }

    // ==========================================
    // ADMIN FUNCTIONS (Government Authority)
    // ==========================================

    function addRegistrar(address _registrar) external onlyAdmin {
        registrars[_registrar] = true;
        emit RegistrarAdded(_registrar);
    }

    function removeRegistrar(address _registrar) external onlyAdmin {
        registrars[_registrar] = false;
        emit RegistrarRemoved(_registrar);
    }

    // ==========================================
    // REGISTRAR FUNCTIONS (Land Officials)
    // ==========================================

    /// @notice Registers a new land parcel, stores metadata, and mints corresponding NFT
    function registerLand(
        uint256 _parcelId,
        address _owner,
        string calldata _location,
        uint256 _area,
        string calldata _documentHash
    ) external onlyRegistrar {
        if (registry[_parcelId].isRegistered) revert ParcelAlreadyExists(_parcelId);

        // Save the metadata directly inside the blockchain storage state
        registry[_parcelId] = LandParcel({
            parcelId: _parcelId,
            owner: _owner,
            location: _location,
            area: _area,
            documentHash: _documentHash,
            isRegistered: true,
            registeredAt: block.timestamp
        });

        // Cross-Contract Call: Trigger LandNFT to mint the token
        landNFTContract.mintLandToken(_owner, _parcelId);

        emit LandRegistered(_parcelId, _owner, _location);
    }

    // ==========================================
    // OWNER FUNCTIONS (Landowner)
    // ==========================================

    /// @notice Transfers ownership of a land parcel to another party
    function transferLandOwnership(uint256 _parcelId, address _newOwner) external {
        if (!registry[_parcelId].isRegistered) revert ParcelDoesNotExist(_parcelId);
        if (registry[_parcelId].owner != msg.sender) revert OnlyParcelOwner();

        address oldOwner = registry[_parcelId].owner;
        
        // Update local registry state
        registry[_parcelId].owner = _newOwner;

        // Execute the actual token transfer on the NFT contract
        landNFTContract.transferFrom(oldOwner, _newOwner, _parcelId);

        emit LandTransferred(_parcelId, oldOwner, _newOwner);
    }

    // ==========================================
    // PUBLIC FUNCTIONS (Anyone)
    // ==========================================

    /// @notice Returns full data payload of a specific parcel for easy public verification
    function getParcelDetails(uint256 _parcelId) external view returns (LandParcel memory) {
        if (!registry[_parcelId].isRegistered) revert ParcelDoesNotExist(_parcelId);
        return registry[_parcelId];
    }
}