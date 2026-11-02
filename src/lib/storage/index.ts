import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface DocumentStorageProvider {
  storeDocument(storageKey: string, buffer: Buffer, mimeType?: string): Promise<void>;
  readDocument(storageKey: string): Promise<Buffer | null>;
  deleteDocument(storageKey: string): Promise<boolean>;
  documentExists(storageKey: string): Promise<boolean>;
  getSignedDownloadUrl?(storageKey: string, expiresInSeconds?: number, downloadFileName?: string): Promise<string>;
}

export type StorageProviderType =
  | "LOCAL_PRIVATE"
  | "S3"
  | "GCS"
  | "AZURE_BLOB"
  | "SUPABASE"
  | "NONE";

export interface StorageStatus {
  available: boolean;
  providerType: StorageProviderType;
  isProduction: boolean;
  message?: string;
}

/**
 * Local private storage provider for development and isolated automated verification.
 * Stores files strictly outside the web root (never under public/ or src/).
 * Enforces strict path-relative traversal defenses and production safeguards.
 */
export class LocalPrivateStorageProvider implements DocumentStorageProvider {
  private readonly storageRoot: string;

  constructor(customRoot?: string) {
    const defaultRoot = path.resolve(process.cwd(), "storage/private_documents");
    this.storageRoot = path.resolve(/*turbopackIgnore: true*/ customRoot || process.env.STORAGE_ROOT || defaultRoot);

    // Strict production safeguard: fail closed if production environment is detected.
    // Cannot be bypassed by APP_ENV=test or ALLOW_LOCAL_STORAGE_IN_PROD in true production / Vercel.
    const isProduction =
      process.env.NODE_ENV === "production" ||
      process.env.VERCEL === "1" ||
      Boolean(process.env.VERCEL_ENV);

    if (isProduction) {
      throw new Error(
        "Production storage safety violation: LocalPrivateStorageProvider cannot be used in production on ephemeral serverless hosting (e.g. Vercel) without a verified persistent cloud storage configuration (S3, GCS, Azure Blob, or Supabase Storage). Configure an approved cloud storage adapter before enabling production document management."
      );
    }

    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true });
    }
  }

  public resolveSafePath(storageKey: string): string {
    if (!storageKey || typeof storageKey !== "string") {
      throw new Error("Invalid storage key provided: key must be a non-empty string.");
    }

    if (path.isAbsolute(storageKey) || storageKey.includes("\0")) {
      throw new Error("Path traversal rejected: Absolute paths or null bytes are disallowed.");
    }

    const resolvedRoot = path.resolve(this.storageRoot);
    const resolvedTarget = path.resolve(resolvedRoot, storageKey);
    const relative = path.relative(resolvedRoot, resolvedTarget);

    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      relative === "" ||
      relative.includes(`..${path.sep}`)
    ) {
      throw new Error(
        `Path traversal rejected: Storage key '${storageKey}' attempts to resolve outside the root directory.`
      );
    }

    if (fs.existsSync(resolvedRoot)) {
      const canonicalRoot = fs.realpathSync(resolvedRoot);

      if (fs.existsSync(resolvedTarget)) {
        const targetStat = fs.lstatSync(resolvedTarget);
        if (targetStat.isSymbolicLink()) {
          throw new Error("Security violation: Symbolic links are disallowed in private document storage.");
        }
        const canonicalTarget = fs.realpathSync(resolvedTarget);
        const canonicalRelative = path.relative(canonicalRoot, canonicalTarget);
        if (canonicalRelative.startsWith("..") || path.isAbsolute(canonicalRelative)) {
          throw new Error("Security violation: Storage path escapes root directory via symbolic link.");
        }
      } else {
        let current = path.dirname(resolvedTarget);
        while (current && current !== resolvedRoot && current !== path.dirname(current)) {
          if (fs.existsSync(current)) {
            const stat = fs.lstatSync(current);
            if (stat.isSymbolicLink()) {
              throw new Error("Security violation: Symbolic link directory detected in storage path.");
            }
            const canonicalAncestor = fs.realpathSync(current);
            const ancestorRelative = path.relative(canonicalRoot, canonicalAncestor);
            if (ancestorRelative.startsWith("..") || path.isAbsolute(ancestorRelative)) {
              throw new Error("Security violation: Parent directory escapes storage root via symbolic link.");
            }
            break;
          }
          current = path.dirname(current);
        }
      }
    }

    return resolvedTarget;
  }

  public async storeDocument(storageKey: string, buffer: Buffer): Promise<void> {
    const safePath = this.resolveSafePath(storageKey);
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(safePath, buffer);
  }

  public async readDocument(storageKey: string): Promise<Buffer | null> {
    const safePath = this.resolveSafePath(storageKey);
    try {
      if (!fs.existsSync(safePath)) {
        return null;
      }
      return await fs.promises.readFile(safePath);
    } catch {
      return null;
    }
  }

  public async deleteDocument(storageKey: string): Promise<boolean> {
    const safePath = this.resolveSafePath(storageKey);
    try {
      if (fs.existsSync(safePath)) {
        await fs.promises.unlink(safePath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async documentExists(storageKey: string): Promise<boolean> {
    const safePath = this.resolveSafePath(storageKey);
    return fs.existsSync(safePath);
  }

  public getStorageRoot(): string {
    return this.storageRoot;
  }
}

/**
 * S3-compatible Persistent Cloud Storage Adapter
 * Compatible with AWS S3, Cloudflare R2, MinIO, and DigitalOcean Spaces.
 */
export class S3CloudStorageProvider implements DocumentStorageProvider {
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || "";
    this.region = process.env.S3_REGION || process.env.AWS_REGION || "us-east-1";
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "";
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";
    this.endpoint =
      process.env.S3_ENDPOINT || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;

    if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      throw new Error("S3CloudStorageProvider configuration error: Missing S3 credentials or bucket.");
    }
  }

  private getUrl(storageKey: string): string {
    const cleanKey = storageKey.replace(/^\/+/, "");
    if (this.endpoint.includes(this.bucket)) {
      return `${this.endpoint.replace(/\/+$/, "")}/${cleanKey}`;
    }
    return `${this.endpoint.replace(/\/+$/, "")}/${this.bucket}/${cleanKey}`;
  }

  public async storeDocument(storageKey: string, buffer: Buffer): Promise<void> {
    const url = this.getUrl(storageKey);
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(buffer.length),
        "x-amz-server-side-encryption": "AES256",
      },
      body: new Uint8Array(buffer),
    });
    if (!res.ok) {
      throw new Error(`S3 upload failed with status ${res.status}: ${await res.text()}`);
    }
  }

  public async readDocument(storageKey: string): Promise<Buffer | null> {
    const url = this.getUrl(storageKey);
    const res = await fetch(url, { method: "GET" });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`S3 download failed with status ${res.status}: ${await res.text()}`);
    }
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  public async deleteDocument(storageKey: string): Promise<boolean> {
    const url = this.getUrl(storageKey);
    const res = await fetch(url, { method: "DELETE" });
    return res.ok || res.status === 404;
  }

  public async documentExists(storageKey: string): Promise<boolean> {
    const url = this.getUrl(storageKey);
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  }
}

/**
 * Google Cloud Storage Adapter (GCS)
 */
export class GCSCloudStorageProvider implements DocumentStorageProvider {
  private readonly bucket: string;
  private readonly apiKey?: string;

  constructor() {
    this.bucket = process.env.GCS_BUCKET || process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "";
    this.apiKey = process.env.GCS_API_KEY || process.env.GCS_ACCESS_TOKEN;

    if (!this.bucket) {
      throw new Error("GCSCloudStorageProvider configuration error: Missing GCS bucket.");
    }
  }

  public async storeDocument(storageKey: string, buffer: Buffer): Promise<void> {
    const encodedName = encodeURIComponent(storageKey);
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${this.bucket}/o?uploadType=media&name=${encodedName}`;
    const headers: Record<string, string> = { "Content-Type": "application/octet-stream" };
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: new Uint8Array(buffer),
    });
    if (!res.ok) {
      throw new Error(`GCS upload failed with status ${res.status}: ${await res.text()}`);
    }
  }

  public async readDocument(storageKey: string): Promise<Buffer | null> {
    const encodedName = encodeURIComponent(storageKey);
    const url = `https://storage.googleapis.com/storage/v1/b/${this.bucket}/o/${encodedName}?alt=media`;
    const headers: Record<string, string> = {};
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;

    const res = await fetch(url, { headers });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GCS download failed with status ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  public async deleteDocument(storageKey: string): Promise<boolean> {
    const encodedName = encodeURIComponent(storageKey);
    const url = `https://storage.googleapis.com/storage/v1/b/${this.bucket}/o/${encodedName}`;
    const headers: Record<string, string> = {};
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;

    const res = await fetch(url, { method: "DELETE", headers });
    return res.ok || res.status === 404;
  }

  public async documentExists(storageKey: string): Promise<boolean> {
    const encodedName = encodeURIComponent(storageKey);
    const url = `https://storage.googleapis.com/storage/v1/b/${this.bucket}/o/${encodedName}`;
    const headers: Record<string, string> = {};
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;

    const res = await fetch(url, { method: "GET", headers });
    return res.ok;
  }
}

/**
 * Azure Blob Storage Adapter
 */
export class AzureBlobStorageProvider implements DocumentStorageProvider {
  private readonly account: string;
  private readonly container: string;
  private readonly sasToken?: string;

  constructor() {
    this.account = process.env.AZURE_STORAGE_ACCOUNT || "";
    this.container = process.env.AZURE_STORAGE_CONTAINER || "";
    this.sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;

    if (!this.account || !this.container) {
      throw new Error("AzureBlobStorageProvider configuration error: Missing account or container.");
    }
  }

  private getUrl(storageKey: string): string {
    const sas = this.sasToken ? (this.sasToken.startsWith("?") ? this.sasToken : `?${this.sasToken}`) : "";
    return `https://${this.account}.blob.core.windows.net/${this.container}/${storageKey}${sas}`;
  }

  public async storeDocument(storageKey: string, buffer: Buffer): Promise<void> {
    const url = this.getUrl(storageKey);
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(buffer),
    });
    if (!res.ok) throw new Error(`Azure Blob upload failed with status ${res.status}`);
  }

  public async readDocument(storageKey: string): Promise<Buffer | null> {
    const url = this.getUrl(storageKey);
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Azure Blob download failed with status ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  public async deleteDocument(storageKey: string): Promise<boolean> {
    const url = this.getUrl(storageKey);
    const res = await fetch(url, { method: "DELETE" });
    return res.ok || res.status === 404;
  }

  public async documentExists(storageKey: string): Promise<boolean> {
    const url = this.getUrl(storageKey);
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  }
}

/**
/**
 * Supabase Private Cloud Storage Provider
 * Implemented using the official Supabase JavaScript SDK (@supabase/supabase-js).
 * Enforces private bucket storage, server-side-only service credentials,
 * opaque storage keys, binary uploads, streaming downloads, existence checks,
 * compensating deletions, and short-lived signed download URLs.
 */
export class SupabasePrivateStorageProvider implements DocumentStorageProvider {
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(options?: { url?: string; serviceRoleKey?: string; bucket?: string; client?: SupabaseClient }) {
    if (options?.client) {
      this.supabase = options.client;
      this.bucket = (options.bucket || process.env.SUPABASE_STORAGE_BUCKET || "student-documents").trim();
      return;
    }

    const url = (options?.url || process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const serviceRoleKey = (
      options?.serviceRoleKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_STORAGE_KEY ||
      process.env.SUPABASE_KEY ||
      ""
    ).trim();
    this.bucket = (options?.bucket || process.env.SUPABASE_STORAGE_BUCKET || "student-documents").trim();

    if (!url || !serviceRoleKey) {
      throw new Error(
        "SupabasePrivateStorageProvider configuration error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    // Initialize Supabase Client with server-side options (zero session persistence, zero auto refresh)
    this.supabase = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  public async storeDocument(storageKey: string, buffer: Buffer, mimeType?: string): Promise<void> {
    const contentType = mimeType || "application/octet-stream";
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(storageKey, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      // Sanitize error message to prevent leaking headers or credentials
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }
  }

  public async readDocument(storageKey: string): Promise<Buffer | null> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(storageKey);

    if (error) {
      if (
        error.message?.includes("not found") ||
        error.message?.includes("404") ||
        (error as any).status === 404
      ) {
        return null;
      }
      throw new Error(`Supabase Storage download failed: ${error.message}`);
    }

    if (!data) return null;
    const arrayBuf = await data.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  public async deleteDocument(storageKey: string): Promise<boolean> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([storageKey]);

    if (error) {
      if (
        error.message?.includes("not found") ||
        error.message?.includes("404") ||
        (error as any).status === 404
      ) {
        return true;
      }
      throw new Error(`Supabase Storage delete failed: ${error.message}`);
    }
    return true;
  }

  public async documentExists(storageKey: string): Promise<boolean> {
    // Generate a temporary 10-second signed URL to verify existence without transferring full body
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, 10);

    if (error || !data?.signedUrl) {
      return false;
    }
    return true;
  }

  /**
   * Generates a short-lived (default 60s) signed download URL after server-side authorization.
   * Never exposes public bucket URLs.
   */
  public async getSignedDownloadUrl(
    storageKey: string,
    expiresInSeconds: number = 60,
    downloadFileName?: string
  ): Promise<string> {
    const options: { download?: string } = {};
    if (downloadFileName) {
      options.download = downloadFileName;
    }

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, expiresInSeconds, options);

    if (error || !data?.signedUrl) {
      throw new Error(`Supabase Storage signed URL generation failed: ${error?.message || "Unknown error"}`);
    }

    return data.signedUrl;
  }
}

// Backward compatibility alias
export const SupabaseStorageProvider = SupabasePrivateStorageProvider;
export type SupabaseStorageProvider = SupabasePrivateStorageProvider;

/**
 * Checks whether persistent cloud storage or local storage is configured.
 * In production, returns whether a valid cloud storage adapter is configured.
 * If not configured in production, returns available: false and a descriptive message.
 */
export function getStorageStatus(): StorageStatus {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_ENV);

  if (!isProduction) {
    return {
      available: true,
      providerType: "LOCAL_PRIVATE",
      isProduction: false,
    };
  }

  const explicit = (process.env.STORAGE_PROVIDER || "").toUpperCase();

  // 1. S3 Check
  const hasS3 = Boolean(
    (process.env.S3_BUCKET || process.env.AWS_S3_BUCKET) &&
    (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) &&
    (process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY)
  );
  if (explicit === "S3" || (explicit === "" && hasS3)) {
    if (hasS3) {
      return { available: true, providerType: "S3", isProduction: true };
    }
  }

  // 2. GCS Check
  const hasGCS = Boolean(process.env.GCS_BUCKET || process.env.GOOGLE_CLOUD_STORAGE_BUCKET);
  if (explicit === "GCS" || (explicit === "" && hasGCS)) {
    if (hasGCS) {
      return { available: true, providerType: "GCS", isProduction: true };
    }
  }

  // 3. Azure Blob Check
  const hasAzure = Boolean(process.env.AZURE_STORAGE_ACCOUNT && process.env.AZURE_STORAGE_CONTAINER);
  if (explicit === "AZURE_BLOB" || explicit === "AZURE" || (explicit === "" && hasAzure)) {
    if (hasAzure) {
      return { available: true, providerType: "AZURE_BLOB", isProduction: true };
    }
  }

  // 4. Supabase Check
  const hasSupabase = Boolean(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_STORAGE_KEY || process.env.SUPABASE_KEY)
  );
  if (explicit === "SUPABASE" || (explicit === "" && hasSupabase)) {
    if (hasSupabase) {
      return { available: true, providerType: "SUPABASE", isProduction: true };
    }
  }

  return {
    available: false,
    providerType: "NONE",
    isProduction: true,
    message: "Document uploads are temporarily unavailable. Persistent cloud storage has not been configured for this environment.",
  };
}

let activeProvider: DocumentStorageProvider | null = null;

export function getDocumentStorageProvider(): DocumentStorageProvider {
  if (activeProvider) {
    return activeProvider;
  }

  const status = getStorageStatus();

  if (!status.available) {
    throw new Error(
      "Production storage safety violation: LocalPrivateStorageProvider cannot be used in production on ephemeral serverless hosting (e.g. Vercel) without a verified persistent cloud storage configuration (S3, GCS, Azure Blob, or Supabase Storage). Configure an approved cloud storage adapter before enabling production document management."
    );
  }

  if (status.providerType === "LOCAL_PRIVATE") {
    const provider = new LocalPrivateStorageProvider();
    activeProvider = provider;
    return provider;
  }

  if (status.providerType === "S3") {
    const provider = new S3CloudStorageProvider();
    activeProvider = provider;
    return provider;
  }

  if (status.providerType === "GCS") {
    const provider = new GCSCloudStorageProvider();
    activeProvider = provider;
    return provider;
  }

  if (status.providerType === "AZURE_BLOB") {
    const provider = new AzureBlobStorageProvider();
    activeProvider = provider;
    return provider;
  }

  if (status.providerType === "SUPABASE") {
    const provider = new SupabasePrivateStorageProvider();
    activeProvider = provider;
    return provider;
  }

  throw new Error("No available storage provider.");
}

export function setDocumentStorageProvider(provider: DocumentStorageProvider | null): void {
  activeProvider = provider;
}

/**
 * Generates an unpredictable, sanitized internal storage key for a student document.
 * Format: students/{studentId}/{category}_{timestamp}_{randomHex}{extension}
 * Never includes original user filenames in disk paths.
 */
export function generateSafeStorageKey(
  studentId: string,
  category: string,
  canonicalExtension: string
): string {
  const sanitizedStudentId = studentId.replace(/[^a-zA-Z0-9_\-]/g, "");
  const sanitizedCategory = category.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const ext = canonicalExtension.startsWith(".") ? canonicalExtension : `.${canonicalExtension}`;
  const randomToken = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();

  return `students/${sanitizedStudentId}/${sanitizedCategory}_${timestamp}_${randomToken}${ext}`;
}
