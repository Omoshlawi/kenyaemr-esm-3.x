const getBaseConfig = require('openmrs/default-rspack-config');

const LIMIT_KI = 244;
const maxSizeBytes = LIMIT_KI * 1024;

module.exports = (...args) => {
  const config = typeof getBaseConfig === 'function' ? getBaseConfig(...args) : getBaseConfig;
  return {
    ...config,
    module: {
      ...config.module,
      rules: [
        ...(config.module?.rules || []),
        {
          test: /\.m?(js|ts|tsx)$/,
          include: /node_modules\/@openmrs/,
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
            },
          },
        },
      ],
    },
    optimization: {
      ...config.optimization,
      splitChunks: {
        ...(config.optimization?.splitChunks || {}),
        maxSize: maxSizeBytes,
      },
    },
  };
};
