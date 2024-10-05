'use strict';
const { sanitizeEntity } = require('strapi-utils');
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async create(ctx) {
        const { post, content, parent, target } = ctx.request.body;

        const find_parent = await strapi.services.comment.findOne({
            _id: parent
        });

        const find_post = await strapi.services.post.findOne({
            _id: post
        });
        
        if(!find_parent) {
            return ctx.response.notFound("Parent comment not found.");
        }

        if(!find_post) {
            return ctx.response.notFound("Post not found.");
        }

        const payload = {
            post: find_post._id,
            parent: find_parent._id,
            user: ctx.state.user.id,
            content: content
        };

        let find_target

        if(target) {
            find_target = await strapi.services.reply.findOne({
                _id: target
            },[{
                path: 'user',
                select: 'username',
                populate: {
                    path: 'profile',
                    select: 'display_name about avatar'
                }
            }]);
            if(!find_target) {
                return ctx.response.notFound("Target not found.");
            }
            payload.target = target;
        }

        const new_reply = await strapi.services.reply.create(payload);
        const updated_parent = await strapi.services.comment.update({ 
            _id: parent
        }, {
            replies: [...find_parent.replies, new_reply._id]
        });
        const updated_post = await strapi.services.post.update({ 
            _id: post
        }, {
            $inc: { comment_counter: 1 },
        });

        /**
         * if "target" is being supplied and "find_target" is found,
         * populate target with the full object inlcuding its user info
         */
        if(target && find_target) {
            new_reply.target = find_target;
        }

        /**
         * Add new reply notification
         */
        if(new_reply.user != ctx.state.user.id) {
            strapi.services.notification.create({
                type: 'reply',
                user: ctx.state.user.id,
                author: updated_parent.user,
                reply: new_reply._id,
                post: updated_post._id,
                read: false
            });
        }

        return sanitizeEntity(new_reply, { model: strapi.models.reply });
    },
    async update(ctx) {
        const find_reply = await strapi.services.reply.findOne({
            _id: ctx.params.id
        },[]);
        if(!find_reply) {
            return ctx.response.notFound("Reply not found.");
        }
        if(find_reply && find_reply.user != ctx.state.user.id) {
            return ctx.response.badRequest("You cannot perform this action.");
        }
        const updated_reply = await strapi.services.reply.update({ 
            _id: ctx.params.id
        }, {
            approved: ctx.request.body.approved
        });
        return sanitizeEntity(updated_reply, { model: strapi.models.reply });
    }
};
