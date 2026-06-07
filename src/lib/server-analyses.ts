import type { Analysis } from "./mock-store";
import type { MvtParsedResult } from "./mvt-parser";

export interface ServerAnalysisRow {
  id: string;
  device: string;
  file_name: string;
  file_size: number;
  result: unknown;
  created_at: string;
}

export function mapServerAnalysis(row: ServerAnalysisRow): Analysis {
  return {
    id: row.id,
    fileName: row.file_name,
    fileSize: row.file_size,
    uploadedAt: row.created_at,
    status: "completed",
    progress: 100,
    result: (row.result as MvtParsedResult) ?? undefined,
  };
}
