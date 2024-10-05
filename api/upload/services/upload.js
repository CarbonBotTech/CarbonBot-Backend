'use strict';
const sharp = require('sharp');
const cloudinary = require('cloudinary');
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API, 
    api_secret: process.env.CLOUDINARY_SECRET
});

module.exports = {

  async prepFile(ctx, file, resize) {

    let buffer;
    let metadata;
    let file_to_upload;
    let sharpProcess;

    /**
     * Convert image to buffer
     */
    try {
      buffer = await sharp(file.path).toBuffer();
    } catch(err) {
      return ctx.response.badRequest("Invalid file.");
    }

    /**
     * Get image meta data
     */
    try {
      metadata = await sharp(buffer).metadata();
    } catch(err) {
      return ctx.response.badRequest("Invalid image metadata.");
    }

    /**
     * Create the instance of image for further processing
     */
    sharpProcess = sharp(buffer);

    /**
     * Resize if the image is too big
     */
    if(metadata.width > resize) {
      sharpProcess.resize({ width: resize });
    }

    /**
     * Reduce image quality
     */
    if(metadata.format === 'png') {
      sharpProcess.png({ compressionLevel: 9, adaptiveFiltering: true, force: true });
    } else {
      sharpProcess.jpeg({ quality: 60, chromaSubsampling: '4:4:4' });
    }
      
    /**
     * Rebuffer the processed image
     */
    file_to_upload = await sharpProcess.toBuffer();

    return file_to_upload;

  },
  /**
   * Upload image to Cloudinary
   * @param {Buffer} image 
   * @param {string} path 
   * @param {object} eager 
   */
  async toCloudinary(image, path, eager) {
    return new Promise((resolve, reject) => {
            
      cloudinary.v2.uploader.upload_stream({
        resource_type: 'auto', 
        public_id: path,
        eager: [eager]
      }, (error, result) => {

        if (error) return reject(error);

        let src = result.eager[0]["secure_url"] ? result.eager[0]["secure_url"] : upload_stream.secure_url;
        return resolve(src);
          
      }).end(image)

    });
  }

};
