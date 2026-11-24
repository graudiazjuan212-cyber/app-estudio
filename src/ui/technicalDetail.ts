import { fileConfig } from '../config.ts';

export type TechnicalDetail = string;
export interface TechnicalInput {
  operation: string; error: unknown; fileName?: string; fileType?: string; size?: number;
  canShare?: boolean | undefined; userAgent: string; now?: string | undefined;
}
export function technicalDetail(input: TechnicalInput): TechnicalDetail {
  const { labels, unavailable, yes, no } = fileConfig;
  const error = input.error instanceof Error ? `${input.error.name}: ${input.error.message}` : String(input.error);
  return [
    `${labels.operation}: ${input.operation}`,
    `${labels.error}: ${error}`,
    `${labels.file}: ${input.fileName ?? unavailable} (${input.fileType ?? unavailable}, ${input.size === undefined ? unavailable : String(input.size)} bytes)`,
    `canShare: ${input.canShare === undefined ? unavailable : input.canShare ? yes : no}`,
    `${labels.browser}: ${input.userAgent}`,
    `${labels.time}: ${input.now ?? unavailable}`,
  ].join('\n');
}

export class FileDeliveryError extends Error {
  constructor(cause: unknown, readonly detail: TechnicalDetail) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.name = 'FileDeliveryError';
  }
}
