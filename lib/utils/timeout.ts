export function withTimeout<T>(promise: PromiseLike<T>, message = "Request timed out.", ms = 12000): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error(message)), ms);
    })
  ]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}
