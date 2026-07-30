import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { ragFunctions } from "@/inngest/functions/rag-indexing";

export const runtime = "nodejs";
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: ragFunctions,
});