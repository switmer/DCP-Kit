import { addons, types } from '@storybook/manager-api';
import { AddonPanel } from '@storybook/components';
import { RegistryPanel } from './components/RegistryPanel';

const ADDON_ID = 'dcp-registry';
const PANEL_ID = `${ADDON_ID}/panel`;

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'DCP Registry',
    render: ({ active }) => (
      <AddonPanel active={!!active}>
        <RegistryPanel active={!!active} />
      </AddonPanel>
    ),
  });
});