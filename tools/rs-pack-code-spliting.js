const getBaseConfig = require('openmrs/default-rspack-config');

const LIMIT_KI = 244;
const maxSizeBytes = LIMIT_KI * 1024;

module.exports = (...args) => {
  const config = typeof getBaseConfig === 'function' ? getBaseConfig(...args) : getBaseConfig;
  return {
    ...config,
    optimization: {
      ...config.optimization,
      splitChunks: {
        ...(config.optimization?.splitChunks || {}),
        maxSize: maxSizeBytes,
      },
    },
  };
};
