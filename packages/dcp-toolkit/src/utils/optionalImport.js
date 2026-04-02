/**
 * Check if an error is a missing module error and format a helpful message.
 * Returns a user-friendly string if it's a missing dep, null otherwise.
 */
export function missingDepMessage(error, feature, packages) {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') return null;
  const pkgs = Array.isArray(packages) ? packages.join(' ') : packages;
  return `"${feature}" requires additional packages.\n  Install with: npm install ${pkgs}`;
}
