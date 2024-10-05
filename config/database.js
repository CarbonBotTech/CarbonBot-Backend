module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'mongoose',
      settings: {
        uri: '',
      },
      options: {
        ssl: true,
      },
    },
  },
});
