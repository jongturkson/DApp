import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

const JWT = process.env.PINATA_JWT;

if (!JWT) {
  console.error("❌ PINATA_JWT not found in .env file");
  process.exit(1);
}

// Single axios instance using JWT — used for all requests
const pinata = axios.create({
  baseURL: "https://api.pinata.cloud",
  headers: {
    Authorization: `Bearer ${JWT}`,
  },
});

// ─── STEP 1: Upload PDF/image, get documentCID ───────────────────────────────
async function uploadDocument(filePath: string): Promise<string> {
  console.log(`\n📄 Uploading document: ${path.basename(filePath)}`);

  const fileBuffer = fs.readFileSync(filePath);
  const fileName   = path.basename(filePath);

  // Use Blob + FormData (Node 18+ built-ins — no extra packages needed)
  const blob     = new Blob([fileBuffer]);
  const formData = new FormData();
  formData.append("file", blob, fileName);
  formData.append("pinataMetadata", JSON.stringify({ name: fileName }));
  formData.append("pinataOptions",  JSON.stringify({ cidVersion: 1 }));

  const response = await pinata.post(
    "/pinning/pinFileToIPFS",
    formData
    // No Content-Type header — browser/Node sets it automatically with boundary
  );

  const documentCID: string = response.data.IpfsHash;
  console.log(`✅ Document uploaded`);
  console.log(`   CID     : ${documentCID}`);
  console.log(`   View at : https://gateway.pinata.cloud/ipfs/${documentCID}`);
  return documentCID;
}

// ─── STEP 2: Build ERC-721 metadata JSON, upload it, get metadataCID ─────────
async function uploadMetadata(params: {
  parcelId:     number;
  ownerAddress: string;
  location:     string;
  areaSqm:      number;
  documentCID:  string;
}): Promise<string> {
  console.log(`\n📋 Building NFT metadata JSON...`);

  const metadata = {
    // Standard ERC-721 fields — read by MetaMask, OpenSea, explorers
    name:         `Cameroon Land Title #${params.parcelId}`,
    description:  `Official land title for parcel #${params.parcelId} on the CamLand decentralized registry.`,
    image:        `ipfs://${params.documentCID}`,
    external_url: "https://your-dapp-url.vercel.app",

    attributes: [
      { trait_type: "Parcel ID",     value: params.parcelId.toString() },
      { trait_type: "Location",      value: params.location             },
      { trait_type: "Area (sqm)",    value: params.areaSqm              },
      { trait_type: "Owner Address", value: params.ownerAddress         },
      { trait_type: "Registry",      value: "CamLand Decentralized Registry" },
      { trait_type: "Network",       value: "Ethereum Sepolia"          },
    ],

    // Custom fields for land registry use
    land_document:  `ipfs://${params.documentCID}`,
    registered_at:  new Date().toISOString(),
  };

  console.log("   Metadata preview:");
  console.log(JSON.stringify(metadata, null, 2));

  const response = await pinata.post("/pinning/pinJSONToIPFS", {
    pinataContent:  metadata,
    pinataMetadata: { name: `LandTitle_Parcel_${params.parcelId}_metadata.json` },
    pinataOptions:  { cidVersion: 1 },
  });

  const metadataCID: string = response.data.IpfsHash;
  console.log(`\n✅ Metadata JSON uploaded`);
  console.log(`   CID     : ${metadataCID}`);
  console.log(`   View at : https://gateway.pinata.cloud/ipfs/${metadataCID}`);
  return metadataCID;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(55));
  console.log("  CamLand IPFS Document & Metadata Uploader");
  console.log("=".repeat(55));

  // ── Edit these values for your test parcel ────────────────
  const DOCUMENT_FILE_PATH = "./sample_docs/dummy_title.pdf";
  const PARCEL_ID          = 1;
  const OWNER_ADDRESS      = "0xYourOwnerAddressHere";
  const LOCATION           = "Plot 12, Avenue du 20 Mai, Yaoundé, Centre Region";
  const AREA_SQM           = 500;
  // ──────────────────────────────────────────────────────────

  if (!fs.existsSync(DOCUMENT_FILE_PATH)) {
    console.error(`\n❌ File not found: ${DOCUMENT_FILE_PATH}`);
    console.error(`   Make sure the file exists at: ${path.resolve(DOCUMENT_FILE_PATH)}`);
    process.exit(1);
  }

  const documentCID = await uploadDocument(DOCUMENT_FILE_PATH);
  const metadataCID = await uploadMetadata({
    parcelId:     PARCEL_ID,
    ownerAddress: OWNER_ADDRESS,
    location:     LOCATION,
    areaSqm:      AREA_SQM,
    documentCID,
  });

  console.log("\n" + "=".repeat(55));
  console.log("  COPY THESE INTO YOUR registerLand() CALL:");
  console.log("=".repeat(55));
  console.log(`  documentCID : "${documentCID}"`);
  console.log(`  metadataCID : "${metadataCID}"`);
  console.log("=".repeat(55));
}

main().catch((err) => {
  const detail = err.response?.data ?? err.message;
  console.error("\n❌ Upload failed:", JSON.stringify(detail, null, 2));
  process.exit(1);
});