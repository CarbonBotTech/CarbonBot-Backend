'use strict';
const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async findOne(ctx) {

        const { username } = ctx.params;

        const user = await strapi
            .query('user', 'users-permissions')
            .findOne({
                username: username
            }, [{
                path: 'profile',
                select: 'display_name about avatar facebook linkedin twitter website'
            }, {
                path: 'company'
            }])
        return sanitizeEntity(user, { model: strapi.query("user", "users-permissions").model });


    },
    async update(ctx) {
        const { id } = ctx.params;
        const { 
            display_name, 
            about,
            twitter,
            facebook,
            linkedin,
            website 
        } = ctx.request.body;

        const profile = await strapi.services.profile.findOne({
            user: id
        },[]);

        if(profile) {
            const updated_profile = await strapi.services.profile.update({ 
                _id: profile._id
             }, {
                display_name: display_name,
                about: about,
                twitter: twitter,
                facebook: facebook,
                linkedin: linkedin,
                website: website
            });
            return sanitizeEntity(updated_profile, { model: strapi.models.profile });
        } else {
            const new_profile = await strapi.services.profile.create({
                user: id,
                display_name: display_name,
                about: about,
                twitter: twitter,
                facebook: facebook,
                linkedin: linkedin,
                website: website
            });
            return sanitizeEntity(new_profile, { model: strapi.models.profile });
        }
    },
    async avatar(ctx) {

        const { id } = ctx.params;
        const { file } = ctx.request.files;

        if(!id || !file) {
            return ctx.response.badRequest("Invalid request");
        }

        let file_to_upload = await strapi.services.upload.prepFile(ctx,file,500);

        /**
         * Upload image
         */
        try {
            
            let uploaded_image_src = await strapi.services.upload.toCloudinary(
                file_to_upload,
                'avatars/' + id,
                {
                    width: 250, height: 250, crop: "thumb"
                }
            )

            /**
             * Try to find user profile
             */

            const profile = await strapi.services.profile.findOne({
                user: id
            },[]);

            if(profile) {
                const updated_profile = await strapi.services.profile.update({ 
                    _id: profile._id
                }, {
                    avatar: uploaded_image_src
                });
                return sanitizeEntity(updated_profile, { model: strapi.models.profile });
            } else {
                const new_profile = await strapi.services.profile.create({
                    user: id,
                    avatar: uploaded_image_src
                });
                return sanitizeEntity(new_profile, { model: strapi.models.profile });
            }

        } catch(error) {
            return ctx.response.badRequest(error);
        }

    }
};
