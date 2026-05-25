// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
 
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LandNFT.sol";
 
/**
 * @title LandRegistry
 * @dev Decentralized Land Registration and Ownership Verification System
 * Designed for the context of Cameroon. Deployed on Ethereum Sepolia.
 */
contract LandRegistry is AccessControl, ReentrancyGuard {
 
    // ----- ROLES -----
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
 
    // ----- DATA STRUCTURES -----
    struct LandParcel {
        uint256 parcelId;
        address owner;
        string location;        // Human-readable location description
        uint256 area;           // Area in square meters
        string documentCID;     // IPFS CID of the land title document
        string metadataCID;     // IPFS CID of the ERC-721 metadata JSON  ← ADD THIS
        bool isRegistered;
        uint256 registeredAt;   // Unix timestamp
        uint256 lastTransferAt; // Unix timestamp of last ownership transfer
    }
 
    // ----- STATE VARIABLES -----
    LandNFT public immutable landNFT;                     // Reference to NFT contract
    uint256 public parcelCount;                 // Total registered parcels
    
    mapping(uint256 => LandParcel) public parcels;      // parcelId → LandParcel
    mapping(address => uint256[]) public ownerParcels;  // owner → list of parcelIds
    mapping(uint256 => address[]) public parcelHistory; // parcelId → ownership history
 
    // ----- EVENTS -----
    event LandRegistered(
        uint256 indexed parcelId,
        address indexed owner,
        string location,
        uint256 area,
        string documentCID,
        string metadataCID,     // ← ADD THIS
        uint256 timestamp
    );
 
    event OwnershipTransferred(
        uint256 indexed parcelId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );
 
    event RegistrarAdded(address indexed registrar, address indexed addedBy);
    event RegistrarRemoved(address indexed registrar, address indexed removedBy);
 
    // ----- CONSTRUCTOR -----
    constructor(address _landNFTAddress) {
        // Grant the deployer the admin role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender); // Admin can also register
 
        landNFT = LandNFT(_landNFTAddress);
    }
 
    // ----- MODIFIERS -----
    modifier onlyRegistrar() {
        require(hasRole(REGISTRAR_ROLE, msg.sender), "Caller is not a registrar");
        _;
    }
 
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        _;
    }
 
    modifier parcelExists(uint256 _parcelId) {
        require(parcels[_parcelId].isRegistered, "Parcel does not exist");
        _;
    }
 
    // ----- ADMIN FUNCTIONS -----
 
    /**
     * @dev Add a new registrar. Only admin can do this.
     */
    function addRegistrar(address _registrar) external onlyAdmin {
        require(_registrar != address(0), "Invalid address");
        _grantRole(REGISTRAR_ROLE, _registrar);
        emit RegistrarAdded(_registrar, msg.sender);
    }
 
    /**
     * @dev Remove a registrar. Only admin can do this.
     */
    function removeRegistrar(address _registrar) external onlyAdmin {
        _revokeRole(REGISTRAR_ROLE, _registrar);
        emit RegistrarRemoved(_registrar, msg.sender);
    }
 
    // ----- CORE FUNCTIONS -----
 
    /**
     * @dev Register a new land parcel. Only registrars can call this.
     * @param _owner The Ethereum address of the landowner
     * @param _location Human-readable location description
     * @param _area Area of the land in square meters
     * @param _documentCID IPFS CID of the uploaded land title document
     */
    function registerLand(
        address _owner,
        string memory _location,
        uint256 _area,
        string memory _documentCID,
        string memory _metadataCID
    ) external onlyRegistrar nonReentrant returns (uint256) {
        require(_owner != address(0), "Invalid owner address");
        require(bytes(_location).length > 0, "Location cannot be empty");
        require(_area > 0, "Area must be greater than 0");
        require(bytes(_documentCID).length > 0, "Document CID cannot be empty");
        require(bytes(_metadataCID).length > 0, "Metadata CID cannot be empty");
 
        parcelCount++;
        uint256 newParcelId = parcelCount;
 
        parcels[newParcelId] = LandParcel({
            parcelId: newParcelId,
            owner: _owner,
            location: _location,
            area: _area,
            documentCID: _documentCID,
            metadataCID:   _metadataCID,
            isRegistered: true,
            registeredAt: block.timestamp,
            lastTransferAt: block.timestamp
        });
 
        ownerParcels[_owner].push(newParcelId);
        parcelHistory[newParcelId].push(_owner);
 
        // Mint an NFT to represent this land title
        // tokenURI now points to the metadata JSON, not directly to the PDF
        string memory tokenURI = string(abi.encodePacked("ipfs://", _metadataCID)); // ← CHANGED
        
        // Ensure LandNFT has this specific function signature
        landNFT.mintLandToken(_owner, newParcelId, tokenURI); 
 
        emit LandRegistered(newParcelId, _owner, _location, _area, _documentCID, _metadataCID, block.timestamp);
 
        return newParcelId;
    }

    /**
     * @dev Transfer ownership of a land parcel.
     * Only the current owner can transfer their own land.
     * @param _parcelId The ID of the parcel to transfer
     * @param _newOwner The Ethereum address of the new owner
     */
    function transferOwnership(uint256 _parcelId, address _newOwner)
        external
        parcelExists(_parcelId)
        nonReentrant
    {
        LandParcel storage parcel = parcels[_parcelId];
        require(parcel.owner == msg.sender, "Only owner can transfer");
        require(_newOwner != address(0), "Invalid new owner address");
        require(_newOwner != msg.sender, "Cannot transfer to yourself");
 
        address previousOwner = parcel.owner;
 
        // Remove parcel from previous owner's list
        _removeParcelFromOwner(previousOwner, _parcelId);
 
        // Update parcel record
        parcel.owner = _newOwner;
        parcel.lastTransferAt = block.timestamp;
 
        // Add to new owner's list
        ownerParcels[_newOwner].push(_parcelId);
 
        // Record history
        parcelHistory[_parcelId].push(_newOwner);
 
        // Transfer the NFT
        landNFT.safeTransferFrom(previousOwner, _newOwner, _parcelId);
 
        emit OwnershipTransferred(_parcelId, previousOwner, _newOwner, block.timestamp);
    }
 
    // ----- VIEW / QUERY FUNCTIONS (no gas cost when called directly) -----
 
    /**
     * @dev Verify the current owner of a parcel.
     */
    function verifyOwnership(uint256 _parcelId)
        external
        view
        parcelExists(_parcelId)
        returns (address owner, string memory location, uint256 area, string memory documentCID)
    {
        LandParcel storage parcel = parcels[_parcelId];
        return (parcel.owner, parcel.location, parcel.area, parcel.documentCID);
    }
 
    /**
     * @dev Get all parcel IDs owned by an address.
     */
    function getParcelsByOwner(address _owner) external view returns (uint256[] memory) {
        return ownerParcels[_owner];
    }
 
    /**
     * @dev Get the full ownership history of a parcel (all past owners).
     */
    function getOwnershipHistory(uint256 _parcelId)
        external
        view
        parcelExists(_parcelId)
        returns (address[] memory)
    {
        return parcelHistory[_parcelId];
    }
 
    /**
     * @dev Get full parcel details.
     */
    function getParcelDetails(uint256 _parcelId)
        external
        view
        parcelExists(_parcelId)
        returns (LandParcel memory)
    {
        return parcels[_parcelId];
    }
 
    /**
     * @dev Check if an address is a registrar.
     */
    function isRegistrar(address _addr) external view returns (bool) {
        return hasRole(REGISTRAR_ROLE, _addr);
    }
 
    /**
     * @dev Check if an address is an admin.
     */
    function isAdmin(address _addr) external view returns (bool) {
        return hasRole(ADMIN_ROLE, _addr);
    }
 
    // ----- INTERNAL HELPER FUNCTIONS -----
 
    /**
     * @dev Remove a parcel ID from an owner's parcel list.
     */
    function _removeParcelFromOwner(address _owner, uint256 _parcelId) internal {
        uint256[] storage parcels_ = ownerParcels[_owner];
        for (uint256 i = 0; i < parcels_.length; i++) {
            if (parcels_[i] == _parcelId) {
                parcels_[i] = parcels_[parcels_.length - 1]; // Move last to this spot
                parcels_.pop();                              // Remove last
                break;
            }
        }
    }
}