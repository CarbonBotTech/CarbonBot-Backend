'use strict';
const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async create(ctx) {

        const company = await strapi.services.company.findOne({
            user: ctx.state.user.id
        },[]);
        
        if(company) {
            return ctx.response.badRequest("You cannot create more than one company per account.");
        }

        /**
         * make sure slug is unique
         */
        let slug = await strapi.services.slugify.generateSlug(
            ctx.request.body.name,
            "company"
        );

        let payload = {
            ...ctx.request.body,
            user: ctx.state.user.id,
            slug: slug
        }
        const new_company = await strapi.services.company.create(payload);
        return sanitizeEntity(new_company, { model: strapi.models.company });

    },
    async update(ctx) {

        const { id } = ctx.params;

        const company = await strapi.services.company.findOne({
            _id: id,
            user: ctx.state.user.id
        },[]);
        
        if(!company) {
            return ctx.response.badRequest("This company doesn't exist.");
        }

        /**
         * make sure slug is unique
         */
        let slug = await strapi.services.slugify.validateSlug(
            ctx.request.body.name,
            "company",
            ctx.params.id
        );
        ctx.request.body.slug = slug;

        const updated_company = await strapi.services.company.update({ 
            _id: company._id
        }, ctx.request.body);

        return sanitizeEntity(updated_company, { model: strapi.models.company });

    },
    async upload(ctx) {

        const { id } = ctx.params;
        const { file } = ctx.request.files;
        const { destination } = ctx.request.body;

        const allowed_destinations = ['poster', 'logo'];

        if(!id || !file || !destination) {
            return ctx.response.badRequest("Invalid request");
        }

        if(!allowed_destinations.includes(destination)) {
            return ctx.response.badRequest("Invalid request");
        }

        let path;
        let transform;
        let resize;
        let field;
        if(destination === 'logo') {
            path = 'company_logos/' + id;
            transform = { width: 250, height: 250, crop: "thumb" };
            resize = 500;
            field = 'logo'
        } else if(destination === 'poster') {
            path = 'company_posters/' + id;
            transform = { width: 1420, height: 720, crop: "thumb" };
            resize = 2000;
            field = 'poster'
        }

        let file_to_upload = await strapi.services.upload.prepFile(ctx,file,resize);

        /**
         * Upload image
         */
        try {
            
            let uploaded_image_src = await strapi.services.upload.toCloudinary(
                file_to_upload,
                path,
                transform
            );
            
            const updated_company = await strapi.services.company.update({ 
                _id: id
            }, {
                [field]: uploaded_image_src
            });

            return sanitizeEntity(updated_company, { model: strapi.models.company });

        } catch(error) {
            return ctx.response.badRequest(error);
        }
        
    }
};
