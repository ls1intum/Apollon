const isLoader = (ruleSetUse) => typeof ruleSetUse === 'object';

module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
  babel: async (options) => ({
    ...options,
    plugins: ['const-enum', ...options.plugins],
  }),
};
