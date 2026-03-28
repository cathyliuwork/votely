const HEADER = "x-admin-secret";

export function getAdminSecret(): string {
  return process.env.ADMIN_SECRET ?? "";
}

export function assertAdmin(request: Request): void {
  const expected = getAdminSecret();
  if (!expected) {
    throw new AdminError("ADMIN_SECRET is not configured", 500);
  }
  const got = request.headers.get(HEADER)?.trim();
  if (!got || got !== expected) {
    throw new AdminError("Unauthorized", 401);
  }
}

export class AdminError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AdminError";
  }
}
