'use strict';
const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async create(ctx) {
        
        const payload = {
            ...ctx.request.body,
            user: ctx.state.user.id
        };

        /**
         * Make sure review by this user of this bot is unique
         */
        
        const find_review = await strapi.services.review.findOne({
            bot: payload.bot,
            user: payload.user
        },[]);

        if(find_review) {
            return ctx.response.badRequest("You cannot review this bot again.");
        }

        /**
         * Create new rating
         */
        const new_rating = await strapi.services.rating.create({
            user: payload.user,
            score: payload.score,
            bot: payload.bot
        });

        /**
         * Create new review
         */

        const new_review = await strapi.services.review.create({
            user: payload.user,
            content: payload.content,
            rating: new_rating._id,
            bot: payload.bot,
            upvotes: []
        });

        /**
         * Update rating with the review ID
         */
        const updated_rating = await strapi.services.rating.update({ 
            _id: new_rating._id
        }, {
            review: new_review
        });

        /**
         * Calculate star rating
         */
        let rating = await strapi.services.rating.calculateRating(payload.bot);

        /**
         * Update bot's review counter & star rating
         */
        const updated_bot = await strapi.services.bot.update({ 
            _id: payload.bot
        }, {
            $inc: { reviews: 1 },
            rating: parseInt(rating)
        });
        let bot = sanitizeEntity(updated_bot, { model: strapi.models.bot });
        let review = sanitizeEntity(new_review, { model: strapi.models.review });

        /**
         * Add notification
         */ 

        if(bot.user != payload.user) {
            strapi.services.notification.add({
                type: 'review',
                user: payload.user,
                author: bot.user,
                read: false,
                bot: bot._id,
                review: review._id
            }, ctx);
        }

        return {
            bot,
            review
        }

    },
    async find(ctx) {
        const reviews = await strapi.services.review.find(ctx.query,[{
            path: 'user',
            select: 'username',
            populate: {
                path: 'profile',
                select: 'display_name about avatar'
            }
        }, {
            path: 'rating'
        }, {
            path: 'bot'
        }]);

        const count = await strapi.services.review.count(ctx.query);
        const current_page = Math.ceil((ctx.query._start - 1) / ctx.query._limit) + 1;
        const total_pages = Math.ceil(count/ctx.query._limit);

        let response = reviews.map(review => sanitizeEntity(review, { model: strapi.models.review }));
        return {
            count: count,
            reviews: response,
            pages: total_pages,
            current: current_page
        };
    },
    async upvote(ctx) {

        const find_review = await strapi.services.review.findOne({
            _id: ctx.params.id
        },[]);
        
        // Check if the user has already upvoted the review
        let find_vote = find_review.upvotes.find(vote => vote.toString() === ctx.state.user.id); //.toString()

        // Remove upvote if found has been found
        if(find_vote) {
            const updated_review = await strapi.services.review.update({ 
                _id: ctx.params.id
            }, {
                upvotes: find_review.upvotes.filter(vote => vote.toString() !== ctx.state.user.id)
            });
            /**
             * Remove notification
             */ 
            const find_notification = await strapi.services.notification.findOne({
                type: 'helpful',
                user: ctx.state.user.id,
                review: find_review._id
            },[]);
            if(find_notification) {
                strapi.services.notification.delete({
                    id: find_notification._id
                });
            }
            return sanitizeEntity(updated_review, { model: strapi.models.review });
        }

        // Add upvote if no vote from the current user has been found        
        const updated_review = await strapi.services.review.update({ 
            _id: ctx.params.id
        }, {
            upvotes: [...find_review.upvotes, ctx.state.user.id]
        });

        /**
         * Add notification
         */ 

        if(find_review.user != ctx.state.user.id) {
            strapi.services.notification.create({
                type: 'helpful',
                user: ctx.state.user.id,
                author: find_review.user,
                read: false,
                bot: find_review.bot,
                review: find_review._id
            });
        }

        return sanitizeEntity(updated_review, { model: strapi.models.review });

    },
    async update(ctx) {

        const { score, content } = ctx.request.body;

        const updated_review = await strapi.services.review.update({ 
            _id: ctx.params.id
        }, {
            content: content
        });

        const updated_rating = await strapi.services.rating.update({ 
            _id: updated_review.rating._id
        }, {
            score: score
        });

        let rating = await strapi.services.rating.calculateRating(updated_review.bot._id);

        const updated_bot = await strapi.services.bot.update({ 
            _id: updated_review.bot._id
        }, {
            rating: parseInt(rating)
        });

        let review = {
            ...updated_review,
            bot: updated_bot,
            rating: updated_rating
        }

        return sanitizeEntity(review, { model: strapi.models.review });

    }
};
