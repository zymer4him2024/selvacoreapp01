import { deleteObject, ref } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';

/**
 * Upload N items in parallel. If any fail, delete the ones that succeeded
 * (so partial-failure does not leave orphaned files in Storage) and re-throw
 * the first error.
 */
export async function uploadAllOrCleanup<T>(
  items: T[],
  uploader: (item: T) => Promise<string>,
): Promise<string[]> {
  const results = await Promise.allSettled(items.map(uploader));
  const succeeded: string[] = [];
  let firstError: unknown = null;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      succeeded.push(result.value);
    } else if (firstError === null) {
      firstError = result.reason;
    }
  }

  if (firstError !== null) {
    await Promise.allSettled(
      succeeded.map((url) => deleteObject(ref(storage, url))),
    );
    throw firstError instanceof Error ? firstError : new Error(String(firstError));
  }

  return succeeded;
}
