import { DefaultAzureCredential } from "@azure/identity"
import { BlobServiceClient } from "@azure/storage-blob"

function getBlobServiceClient(): BlobServiceClient {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim()
  if (accountName) {
    return new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new DefaultAzureCredential()
    )
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim()
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString)
  }

  throw new Error(
    "Missing Azure Blob configuration. Set AZURE_STORAGE_ACCOUNT_NAME for managed identity access or AZURE_STORAGE_CONNECTION_STRING for local/dev access."
  )
}

export async function uploadToBlob(
  blobPath: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const containerName =
    process.env.AZURE_STORAGE_CONTAINER_NAME ?? "calendars"

  const serviceClient = getBlobServiceClient()
  const containerClient = serviceClient.getContainerClient(containerName)
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath)

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  })
}
