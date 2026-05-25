const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// The secure JWT from your .env file
const PINATA_JWT = process.env.PINATA_JWT;

async function uploadFileToIPFS() {
    try {
        // 1. Locate the file on your local machine
        const filePath = path.join(__dirname, "../sample_docs/dummy_title.pdf");
        
        // 2. Create a readable stream of the file
        const fileStream = fs.createReadStream(filePath);
        
        // 3. Package the file into a FormData object
        const data = new FormData();
        data.append("file", fileStream);

        // Optional: Add metadata so you can easily find it in your Pinata dashboard
        const metadata = JSON.stringify({
            name: "Test_Land_Title_Buea",
        });
        data.append("pinataMetadata", metadata);

        console.log("Uploading to IPFS via Pinata...");

        // 4. Send the POST request to Pinata's pinning API
        const response = await axios.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            data,
            {
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
                    Authorization: `Bearer ${PINATA_JWT}`,
                },
            }
        );

        // 5. Output the resulting Content Identifier (CID)
        console.log("✅ Upload Successful!");
        console.log("IPFS Hash (CID):", response.data.IpfsHash);
        console.log("Pin Size (Bytes):", response.data.PinSize);
        console.log("Timestamp:", response.data.Timestamp);
        
        return response.data.IpfsHash;

    } catch (error) {
        console.error("❌ Error uploading file:");
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

// Execute the function
uploadFileToIPFS();