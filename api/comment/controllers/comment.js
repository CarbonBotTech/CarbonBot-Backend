'use strict';
const { sanitizeEntity } = require('strapi-utils');
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {

    async create(ctx) {
        const { post, content } = ctx.request.body;
        const payload = {
            user: ctx.state.user.id,
            content: content,
            post: post
        };
        const updated_post = await strapi.services.post.update({ 
            _id: post
        }, {
            $inc: { comment_counter: 1 },
        });
        const new_comment = await strapi.services.comment.create(payload);
        /**
         * Add new comment notification
         */
        if(updated_post.user != ctx.state.user.id) {
            strapi.services.notification.create({
                type: 'comment',
                user: ctx.state.user.id,
                author: updated_post.user,
                comment: new_comment._id,
                post: updated_post._id,
                read: false
            });
        }
        return sanitizeEntity(new_comment, { model: strapi.models.comment });
    },
    async find(ctx) {

        const { id } = ctx.params;
        const params = {
            ...ctx.query,
            post: id
        }
        const comments = await strapi.services.comment.find(params,[{
            path: 'user',
            select: 'username',
            populate: {
                path: 'profile',
                select: 'display_name about avatar'
            }
        }, {
            path: 'replies',
            populate: [{
                path: 'user',
                select: 'username',
                populate: {
                    path: 'profile',
                    select: 'display_name about avatar'
                }
            },{
                path: 'target',
                populate: {
                    path: 'user',
                    select: 'username',
                    populate: {
                        path: 'profile',
                        select: 'display_name about avatar'
                    }
                }
            }]
        }]);

        return comments.map(comment => sanitizeEntity(comment, { model: strapi.models.comment }));
    
    },
    async update(ctx) {
        const find_comment = await strapi.services.comment.findOne({
            _id: ctx.params.id
        },[]);
        if(!find_comment) {
            return ctx.response.notFound("Reply not found.");
        }
        if(find_comment && find_comment.user != ctx.state.user.id) {
            return ctx.response.badRequest("You cannot perform this action.");
        }
        const updated_comment = await strapi.services.comment.update({ 
            _id: ctx.params.id
        }, {
            approved: ctx.request.body.approved
        });
        return sanitizeEntity(updated_comment, { model: strapi.models.comment });
    }
};
