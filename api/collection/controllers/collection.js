'use strict';
const { sanitizeEntity } = require('strapi-utils');
const validMongoId = new RegExp("^[0-9a-fA-F]{24}$");

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async find(ctx) {
        // only approved collections should be returned
        ctx.query = {
            ...ctx.query,
            approved: true
        }
        const collections = await strapi.services.collection.find(ctx.query, [{
            path: 'user',
            select: 'username',
            populate: {
                path: 'profile',
                select: 'display_name about avatar'
            }
        }]);
        if(collections.length === 0) {
            return ctx.response.notFound("Collection not found.");
        }

        const count = await strapi.services.collection.count(ctx.query);
        const current_page = Math.ceil((ctx.query._start - 1) / ctx.query._limit) + 1;
        const total_pages = Math.ceil(count/ctx.query._limit);

        let response = collections.map(collection => sanitizeEntity(collection, { model: strapi.models.collection }));
        return {
            count: count,
            collections: response,
            pages: total_pages,
            current: current_page
        };
    },
    async create(ctx) {
        /**
         * make sure slug is unique
         */
        let slug = await strapi.services.slugify.generateSlug(
            ctx.request.body.title,
            "collection"
        );
        const payload = {
            ...ctx.request.body,
            user: ctx.state.user.id,
            slug: slug
        };
        const new_collection = await strapi.services.collection.create(payload);
        return sanitizeEntity(new_collection, { model: strapi.models.collection });
    },
    async update(ctx) {

        const collection = await strapi.services.collection.findOne({
            _id: ctx.params.id
        }, []);

        if(!collection) {
            return ctx.response.notFound("Collection not found.");
        }

        if(collection.user.toString() !== ctx.state.user.id) {
            return ctx.response.badRequest("You cannot perform this action.");
        }
        
        /**
         * make sure slug is unique
         */
        let slug = await strapi.services.slugify.validateSlug(
            ctx.request.body.title,
            "collection",
            ctx.params.id
        );
        ctx.request.body.slug = slug;
        
        const updated_collection = await strapi.services.collection.update({ 
            _id: ctx.params.id
        }, ctx.request.body);

        return sanitizeEntity(updated_collection, { model: strapi.models.collection });
    },
    async manageCollection(ctx) {

        const collection = await strapi.services.collection.findOne({
            _id: ctx.params.id
        }, []);
        
        const bot = await strapi.services.bot.findOne({
            _id: ctx.params.bot_id
        }, []);

        if(!bot || !collection) {
            return ctx.response.badRequest("Collection or bot not found.");
        }

        if(collection.user.toString() !== ctx.state.user.id) {
            return ctx.response.badRequest("You cannot perform this action.");
        }
        
        let find_bot_in_collection = collection.bots.find(bot => bot.toString() === ctx.params.bot_id);
        let query;
        if(find_bot_in_collection) {
            // bot found. remove from collection
            query = {
                bots: collection.bots.filter(bot => bot.toString() !== ctx.params.bot_id),
                $inc: { bot_counter: -1 }
            }
        } else {
            // bot not found. add to collection
            query = {
                bots: [...collection.bots, ctx.params.bot_id],
                $inc: { bot_counter: 1 }
            }
        }

        let updated_collection = await strapi.models.collection.findOneAndUpdate(
            { _id: ctx.params.id },
            query,
            { new: true }
        ).populate([{
            path: 'user',
            select: 'username',
            populate: {
                path: 'profile',
                select: 'display_name about avatar'
            }
        }])
        return updated_collection;

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
        
        /**
         * Find collection
         */
        const collection = await strapi.services.collection.findOne(query, []);
        if(!collection) {
            return ctx.response.notFound("Collection not found.");
        }
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
         * Look for Bots IDs from the collection 
         */

        let bot_query = {
            ...ctx.query,
            _id: { $in: collection.bots }
        }
        const bots = await strapi.services.bot.find(bot_query, [{
            path: 'user',
            select: 'username',
            populate: {
                path: 'profile',
                select: 'display_name about avatar'
            }
        },{
            path: 'platforms'
        }, {
            path: 'categories'
        }, {
            path: 'company'
        }]);

        const count = await strapi.services.bot.count(bot_query);
        const current_page = Math.ceil((bot_query._start - 1) / bot_query._limit) + 1;
        const total_pages = Math.ceil(count/bot_query._limit);

        let response = bots.map(bot => sanitizeEntity(bot, { model: strapi.models.bot }));
        return {
            count: count,
            bots: response,
            pages: total_pages,
            current: current_page
        };
    },
    async upload(ctx) {
        const { id } = ctx.params;
        const { file } = ctx.request.files;
        const { destination } = ctx.request.body;

        const collection = await strapi.services.collection.findOne({
            _id: id
        }, []);
        if(collection.user.toString() !== ctx.state.user.id) {
            return ctx.response.badRequest("You cannot perform this action.");
        }
        
        const allowed_destinations = ['poster'];

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
        if(destination === 'poster') {
            path = 'collection_posters/' + id;
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
            
            const updated_collection = await strapi.services.collection.update({ 
                _id: id
            }, {
                [field]: uploaded_image_src
            });

            return sanitizeEntity(updated_collection, { model: strapi.models.collection });

        } catch(error) {
            return ctx.response.badRequest(error);
        }
    },
    async vote(ctx) {

        const find_collection = await strapi.services.collection.findOne({
            _id: ctx.params.id
        },[]);

        // Check if the user has already upvoted this collection
        let find_vote = find_collection.upvotes.find(vote => vote.toString() === ctx.state.user.id);

        // Remove upvote if found has been found
        if(find_vote) {
            const updated_collection = await strapi.services.collection.update({ 
                _id: ctx.params.id
            }, {
                upvotes: find_collection.upvotes.filter(vote => vote.toString() !== ctx.state.user.id),
                $inc: { upvote_counter: -1 }
            });
            /**
             * Remove notification
             */ 
            const find_notification = await strapi.services.notification.findOne({
                type: 'collection',
                user: ctx.state.user.id,
                collection_: find_collection._id
            },[]);
            if(find_notification) {
                strapi.services.notification.delete({
                    id: find_notification._id
                });
            }
            return sanitizeEntity(updated_collection, { model: strapi.models.collection });
        }

        // Add upvote if no vote from the current user has been found        
        const updated_collection = await strapi.services.collection.update({ 
            _id: ctx.params.id
        }, {
            upvotes: [...find_collection.upvotes, ctx.state.user.id],
            $inc: { upvote_counter: 1 }
        });

        /**
         * Add notification
         */ 

        if(find_collection.user != ctx.state.user.id) {
            strapi.services.notification.create({
                type: 'collection',
                user: ctx.state.user.id,
                author: find_collection.user,
                read: false,
                collection_: find_collection._id
            });
        }

        return sanitizeEntity(updated_collection, { model: strapi.models.collection });

    },
    async delete(ctx) {
        const collection = await strapi.services.collection.findOne({
            _id: ctx.params.id
        }, []);
        if(!collection) {
            return ctx.response.notFound("Collection not found.");
        }
        if(collection.user.toString() !== ctx.state.user.id) {
            return ctx.response.badRequest("You cannot perform this action.");
        }
        const deleted_collection = await strapi.services.collection.update({ 
            _id: ctx.params.id
        }, {
            approved: false
        });
        return sanitizeEntity(deleted_collection, { model: strapi.models.collection });
    }
};
