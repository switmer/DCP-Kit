/**
 * Shared CLI output helpers
 */

export function jsonError(error) {
  console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
}

/**
 * Print a command result, branching on json mode.
 * @param {object} opts
 * @param {boolean} opts.json - whether to use JSON output
 * @param {object} opts.data - the data payload for JSON mode
 * @param {function} opts.human - a zero-arg function that prints human-readable output
 */
export function result({ json, data, human }) {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    human();
  }
}

/**
 * Print a success/failure summary line.
 */
export function summary(ok, message) {
  console.log(ok ? `✅ ${message}` : `❌ ${message}`);
}
