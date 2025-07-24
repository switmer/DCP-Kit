// Storybook preset for easier installation
export function managerEntries(entry: string[] = []) {
  return [...entry, './register.js'];
}

export const presets = [
  {
    name: '@dcp/storybook-addon-registry/preset',
  },
];