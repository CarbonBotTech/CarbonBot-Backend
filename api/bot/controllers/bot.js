'use strict';
const { sanitizeEntity } = require('strapi-utils');
const validMongoId = new RegExp("^[0-9a-fA-F]{24}$");
const { upload } = require('../../company/controllers/company');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async find(ctx) {

        /**
         * Replace Platform & Category slugs with their corresponding IDs
         */
        if(ctx.query.platforms) {
            let platform_slugs = ctx.query.platforms.split(',');            
            const find_platforms = await strapi.services.platform.find({
                slug: platform_slugs
            },[]);  
            let platform_ids = find_platforms.map(a => a._id);
            ctx.query.platforms = platform_ids;
        }
        if(ctx.query.categories) {
            let category_slugs  = ctx.query.categories.split(',');
            const find_categories = await strapi.services.category.find({
                slug: category_slugs
            },[]);
            let category_ids = find_categories.map(a => a._id);
            ctx.query.categories = category_ids;
        }

        /**
         * Find the entries
         */
        const bots = await strapi.services.bot.find(ctx.query, [{
            path: 'user',
            select: 'username',
            populate: {
                path: 'profile',
                select: 'display_name about avatar'
            }
        }, {
            path: 'platforms'
        }, {
            path: 'categories'
        }, {
            path: 'company'
        }]);

        const count = await strapi.services.bot.count(ctx.query);
        const current_page = Math.ceil((ctx.query._start - 1) / ctx.query._limit) + 1;
        const total_pages = Math.ceil(count/ctx.query._limit);

        let response = bots.map(bot => sanitizeEntity(bot, { model: strapi.models.bot }));
        return {
            count: count,
            bots: response,
            pages: total_pages,
            current: current_page
        };
    },
    async my(ctx) {
        const params = {
            user: ctx.state.user.id,
            ...ctx.query
        }
        const entities = await strapi.services.bot.find(params, [{
            path: 'user',
            select: 'username',
            populate: {
                path: 'profile',
                select: 'display_name about avatar'
            }
        }, {
            path: 'platforms'
        }, {
            path: 'categories'
        }, {
            path: 'company'
        }]);
        return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.bot }));
    },
    async findOne(ctx) {

        const { id } = ctx.params; // id or slug

        /**
         * Figure out whether Mongo ID or slug is being used
         */
        let query;
        if(validMongoId.test(id)) {
			query = {
				_id: id
			}
		} else {
			query = {
				slug: id
			}
		}

        const bot = await strapi.services.bot.findOne(query,[{
            path: 'user',
            select: 'username',
            populate: {
                path: 'profile',
                select: 'display_name about avatar'
            }
        }, {
            path: 'platforms'
        }, {
            path: 'categories'
        }, {
            path: 'company'
        }]);

        if(!bot) {
            return ctx.response.notFound("Bot not found");
        }

        return sanitizeEntity(bot, { model: strapi.models.bot });

    },
    async create(ctx) {
        
        /**
         * make sure slug is unique
         */
        let slug = await strapi.services.slugify.generateSlug(
            ctx.request.body.name,
            "bot"
        );
        
        const payload = {
            ...ctx.request.body,
            user: ctx.state.user.id,
            slug: slug,
            reviews: 0,
            rating: 0
        };

        const new_bot = await strapi.services.bot.create(payload);

        return sanitizeEntity(new_bot, { model: strapi.models.bot });

    },
    async update(ctx) {

        const { id } = ctx.params;

        /**
         * make sure slug is unique
         */
        let slug = await strapi.services.slugify.validateSlug(
            ctx.request.body.name,
            "bot",
            ctx.params.id
        );
        ctx.request.body.slug = slug;

        if(!ctx.request.body.company) {
            ctx.request.body.company = null;
        }

        const updated_bot = await strapi.services.bot.update({ 
            _id: id
        }, ctx.request.body);

        return sanitizeEntity(updated_bot, { model: strapi.models.bot });
        
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
            path = 'bot_logos/' + id;
            transform = { width: 250, height: 250, crop: "thumb" };
            resize = 500;
            field = 'logo'
        } else if(destination === 'poster') {
            path = 'bot_posters/' + id;
            transform = { width: 1420, height: 720, crop: "thumb" };
            resize = 2000;
            field = 'poster'
        }

        let file_to_upload = await strapi.services.upload.prepFile(ctx,file,resize);

        try {
            
            let uploaded_image_src = await strapi.services.upload.toCloudinary(
                file_to_upload,
                path,
                transform
            );
            
            const updated_bot = await strapi.services.bot.update({ 
                _id: id
            }, {
                [field]: uploaded_image_src
            });

            return sanitizeEntity(updated_bot, { model: strapi.models.bot });

        } catch(error) {
            return ctx.response.badRequest(error);
        }
    },
    async search(ctx) {
        const { query } = ctx.params;
        if(!query) return [];
        const search = await strapi.query('bot').search({ _q: query, _limit: 20, _start: 0 },[])
        return search
        //return sanitizeEntity(search, { model: strapi.models.conspiracy });
    },
    async delete(ctx) {
        const bot = await strapi.services.bot.findOne({
            _id: ctx.params.id
        }, []);
        if(!bot) {
            return ctx.response.notFound("Bot not found.");
        }
        if(bot.user.toString() !== ctx.state.user.id) {
            return ctx.response.badRequest("You cannot perform this action.");
        }
        const deleted_bot = await strapi.services.bot.update({ 
            _id: ctx.params.id
        }, {
            approved: false
        });
        return sanitizeEntity(deleted_bot, { model: strapi.models.bot });
    }
};
