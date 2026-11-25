export type VaultErrorCode = 'auth' | 'forbidden' | 'offline' | 'not_found' | 'validation' | 'network';

export class VaultError extends Error {
  readonly code: VaultErrorCode;

  constructor(message: string, code: VaultErrorCode) {
    super(message);
    this.name = 'VaultError';
    this.code = code;
  }
}

export function errorMessage(error: unknown, fallback = 'Something went wrong in the vault.'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
