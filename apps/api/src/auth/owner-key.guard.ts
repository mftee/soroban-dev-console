/**
 * MVP Auth Strategy — Owner Key
 *
 * Scope: Private workspace mutation routes only.
 *
 * How it works:
 *   - The client sends an `x-owner-key` header (a secret string the user
 *     controls, e.g. a Stellar public key or a random UUID they generate
 *     locally and store in localStorage).
 *   - The API stores this key as `ownerKey` on the Workspace row.
 *   - Any mutation (create / update / delete / import) requires the header
 *     to match the stored ownerKey.
 *   - Public share-link routes (GET /shares/:token) do NOT require this
 *     header — they are intentionally read-only and unauthenticated.
 *
 * Limitations (MVP):
 *   - There is no server-side session or JWT. The owner key is bearer-style.
 *   - Key rotation is not supported in this iteration.
 *   - Rate-limiting on the existing middleware provides the only brute-force
 *     protection. A proper auth system (e.g. Stellar signature challenge)
 *     should replace this before production.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

@Injectable()
export class OwnerKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.headers["x-owner-key"];

    if (!key || typeof key !== "string" || key.trim().length === 0) {
      throw new UnauthorizedException(
        "Missing x-owner-key header. Provide your workspace owner key to mutate private workspaces.",
      );
    }

    // Attach to request so controllers can pass it to the service
    (req as any).ownerKey = key.trim();
    return true;
  }
}
