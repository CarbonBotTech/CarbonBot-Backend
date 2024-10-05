module.exports = ({ env }) => ({
  email: {
    provider: 'sendgrid',
    providerOptions: {
      apiKey: process.env.SENDGRID_API,
    },
    settings: {
      defaultFrom: '',
      defaultReplyTo: '',
    },
  },
  upload: {
    provider: 'cloudinary',
    providerOptions: {
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API,
      api_secret: process.env.CLOUDINARY_SECRET,
    },
  }
});
