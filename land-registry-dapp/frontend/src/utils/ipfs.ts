import axios from "axios";

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

const pinataAxios = axios.create({
    headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
    },
});

// Uploads the raw PDF/Image [cite: 243]
export async function uploadDocumentToIPFS(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    
    const metadata = JSON.stringify({ name: file.name });
    formData.append("pinataMetadata", metadata);

    const response = await pinataAxios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
    );

    return response.data.IpfsHash;
}

// Uploads the ERC-721 JSON Metadata
export async function uploadMetadataToIPFS(metadata: any): Promise<string> {
    const response = await pinataAxios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
            pinataContent: metadata,
            pinataMetadata: { name: `LandTitle_Metadata.json` }
        },
        { headers: { "Content-Type": "application/json" } }
    );

    return response.data.IpfsHash;
}