// Each route mount owns its events, including handlers registered after an image decodes.
export function createOwnership() {
  const controller = new AbortController();
  const cleanups = [];
  return {
    get alive() {
      return !controller.signal.aborted;
    },
    listen(target, type, callback, options = {}) {
      if (controller.signal.aborted) return;
      const settings =
        typeof options === "boolean" ? { capture: options } : options;
      target.addEventListener(type, callback, {
        ...settings,
        signal: controller.signal,
      });
    },
    cleanup(callback) {
      if (controller.signal.aborted) callback();
      else cleanups.push(callback);
    },
    dispose() {
      controller.abort();
      cleanups.reverse().forEach((cleanup) => cleanup());
      cleanups.length = 0;
    },
  };
}
