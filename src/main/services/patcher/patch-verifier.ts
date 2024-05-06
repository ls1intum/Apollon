import { debounce, debounceTime, groupBy, mergeMap, Subject, tap } from 'rxjs';
import { Patch } from './patcher-types';
import { Operation, ReplaceOperation } from 'fast-json-patch';

/**
 * A signed replace operation is a replace operation with an additional hash property.
 * This enables tracing the origin of a replace operation.
 */
export type SignedReplaceOperation = ReplaceOperation<any> & { hash: string };

/**
 * A signed operation is either a replace operation with a hash property or any other operation.
 * The hash property is used to verify the origin of a replace operation.
 * Only replace operations need a hash property.
 */
export type SignedOperation = Exclude<Operation, ReplaceOperation<any>> | SignedReplaceOperation;

/**
 * A signed patch is a patch where all replace operations are signed, i.e.
 * all the replace operations have a hash allowing for tracing their origin.
 */
export type SignedPatch = SignedOperation[];

/**
 * @param operation
 * @returns true if the operation is a replace operation, false otherwise
 */
export function isReplaceOperation(operation: Operation): operation is ReplaceOperation<any> {
  return operation.op === 'replace';
}

/**
 * @param operation
 * @returns true if the operation is a signed operation, false otherwise. A signed operation is either
 * a replace operation with a hash property or any other operation.
 */
export function isSignedOperation(operation: Operation): operation is SignedOperation {
  return !isReplaceOperation(operation) || 'hash' in operation;
}

/**
 * A patch verifier enables otpimisitc discard of incomging changes.It can be used to sign
 * each operation (or opeerations of each patch) and track them. If the server broadcasts changes
 * of the same scope (e.g. the same path) before re-broadcasting that particular change, the client
 * can safely discard the change as it will (optimistically) be overridden when the server re-broadcasts
 * the tracked change.
 *
 * This greatly helps with stuttering issues due to clients constantly re-applying changes they have
 * already applied locally but in a different order. See
 * [**this issue**](https://github.com/ls1intum/Apollon_standalone/pull/70) for more details.
 */
export class PatchVerifier {
  /**
   * In some cases, the rebroadcast of a change might be delayed or lost.
   * To prevent the client from indefninitely discarding changes on the same path,
   * the verifier will discard changes on the same path until a certain time.
   */
  static SUPRESSION_WINDOW = 200;

  private waitlist: { [address: string]: string } = {};
  private cleanup = new Subject<string>();

  constructor() {
    // This ensures that the waitlist is cleaned up after a certain time.
    // Otherwise, due to message loss, some specific paths on the waitlist might be locked up.
    this.cleanup
      .pipe(
        groupBy((path) => path),
        mergeMap((group) => group.pipe(debounceTime(PatchVerifier.SUPRESSION_WINDOW))),
        tap((path) => delete this.waitlist[path]),
      )
      .subscribe();
  }
  /**
   * Signs an operation and tracks it. Only replace operations are signed and tracked.
   * @param operation
   * @returns The signed version of the operation (to be sent to the server)
   */
  public signOperation(operation: Operation): SignedOperation {
    if (isReplaceOperation(operation)) {
      const hash = Math.random().toString(36).substring(2, 15);
      const path = operation.path;
      this.waitlist[path] = hash;
      this.cleanup.next(path);

      return { ...operation, hash };
    } else {
      return operation;
    }
  }

  /**
   * Signs all operations inside the patch.
   * @param patch
   * @returns the signed patch (to be sent to the server)
   */
  public sign(patch: Patch): SignedPatch {
    return patch.map((op) => this.signOperation(op));
  }

  /**
   * Checks whether the operation should be applied or should it be optimisitcally discarded.
   * - If the operation is not a replace operation, it is always applied.
   * - If the operation is a replace operation but it is not signed, it is always applied.
   * - If the operation is a signed replace operation and no other operation with the same path is tracked,
   *   it will be applied.
   * - Otherwise it will be discarded.
   *
   * If it receives an operation that is already tracked, it will be discarded, and the
   * operation will be untracked (so following operations on the same path will be applied).
   *
   * @param operation
   * @returns true if the operation should be applied, false if it should be discarded.
   */
  public isVerifiedOperation(operation: Operation): boolean {
    if (isReplaceOperation(operation) && isSignedOperation(operation) && operation.path in this.waitlist) {
      if (this.waitlist[operation.path] === operation.hash) {
        delete this.waitlist[operation.path];
      }

      return false;
    } else {
      return true;
    }
  }

  /**
   * Filters an incoming patch, only leaving the operations that should be applied.
   * @param patch
   * @returns a patch with operations that should be applied.
   */
  public verified(patch: Patch): Patch {
    return patch.filter((op) => this.isVerifiedOperation(op));
  }
}
