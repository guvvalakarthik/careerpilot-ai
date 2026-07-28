import { createHash } from "node:crypto";
import {
  RAG_CHUNK_MAX_CHARACTERS,
  RAG_CHUNK_OVERLAP_CHARACTERS,
} from "./config";

export interface RagTextChunk {
  chunkIndex: number;
  content: string;
  contentHash: string;
  tokenCount: number;
}

export interface ChunkTextOptions {
  maxCharacters?: number;
  overlapCharacters?: number;
}

export function hashRagContent(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function normalizeRagText(content: string) {
  return content
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chooseChunkEnd(content: string, start: number, maximumEnd: number) {
  if (maximumEnd >= content.length) return content.length;

  const minimumUsefulEnd = start + Math.floor((maximumEnd - start) * 0.6);
  const boundaries = ["\n\n", "\n", ". ", " "];

  for (const boundary of boundaries) {
    const boundaryIndex = content.lastIndexOf(boundary, maximumEnd - boundary.length);
    if (boundaryIndex >= minimumUsefulEnd) {
      return boundaryIndex + (boundary === ". " ? 1 : boundary.length);
    }
  }

  return maximumEnd;
}

export function chunkRagText(
  rawContent: string,
  options: ChunkTextOptions = {},
): RagTextChunk[] {
  const maxCharacters = options.maxCharacters ?? RAG_CHUNK_MAX_CHARACTERS;
  const overlapCharacters =
    options.overlapCharacters ?? RAG_CHUNK_OVERLAP_CHARACTERS;

  if (!Number.isInteger(maxCharacters) || maxCharacters < 200) {
    throw new Error("RAG chunk size must be an integer of at least 200 characters.");
  }
  if (
    !Number.isInteger(overlapCharacters) ||
    overlapCharacters < 0 ||
    overlapCharacters >= maxCharacters / 2
  ) {
    throw new Error("RAG chunk overlap must be non-negative and less than half the chunk size.");
  }

  const content = normalizeRagText(rawContent);
  if (!content) return [];

  const chunks: RagTextChunk[] = [];
  let start = 0;

  while (start < content.length) {
    const maximumEnd = Math.min(content.length, start + maxCharacters);
    const end = chooseChunkEnd(content, start, maximumEnd);
    const chunkContent = content.slice(start, end).trim();

    if (chunkContent) {
      chunks.push({
        chunkIndex: chunks.length,
        content: chunkContent,
        contentHash: hashRagContent(chunkContent),
        tokenCount: Math.max(1, Math.ceil(chunkContent.length / 4)),
      });
    }

    if (end >= content.length) break;
    start = Math.max(start + 1, end - overlapCharacters);
  }

  return chunks;
}
