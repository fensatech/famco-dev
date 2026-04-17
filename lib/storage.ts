import { BlobServiceClient } from "@azure/storage-blob"

export async function uploadToBlob(
  blobPath: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!
  const containerName =
    process.env.AZURE_STORAGE_CONTAINER_NAME ?? "calendars"

  const serviceClient =
    BlobServiceClient.fromConnectionString(connectionString)
  const containerClient = serviceClient.getContainerClient(containerName)
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath)

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  })
}
