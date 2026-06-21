import fs from "fs";
import path from "path";
import crypto from "crypto";

const STORAGE_PATH = path.resolve(__dirname, "../../../storage/attachments");

export const StorageService = {
  saveAttachment: async (filename: string, content: Buffer): Promise<string> => {
    // Ensure directory exists
    if (!fs.existsSync(STORAGE_PATH)) {
      fs.mkdirSync(STORAGE_PATH, { recursive: true });
    }

    // Generate unique filename to avoid conflicts
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const finalFilename = `${uniqueSuffix}-${safeFilename}`;
    const filePath = path.join(STORAGE_PATH, finalFilename);

    await fs.promises.writeFile(filePath, content);
    
    // Return relative path or identifier that can be used to serve the file
    return `/attachments/${finalFilename}`;
  },

  getAttachment: async (filename: string): Promise<Buffer> => {
    const filePath = path.join(STORAGE_PATH, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error("Attachment not found");
    }
    return await fs.promises.readFile(filePath);
  }
};
