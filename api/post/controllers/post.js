'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {};
'use strict';
const { sanitizeEntity } = require('strapi-utils');
const validMongoId = new RegExp("^[0-9a-fA-F]{24}$");
const getUrls = require("get-urls");
const findHashtags = require('find-hashtags');
const axios = require("axios");
const { create, update } = require('../../review/controllers/review');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async create(ctx) {

        const { content, channel, title, type } = ctx.request.body;

        let new_post_query = {
            title: title,
            channel: channel,
            type: type,
            user: ctx.state.user._id,
            tags: []
        }

        if(type === "text") {
            let tags = strapi.services.post.findTags(content,ctx);
            let link = await strapi.services.post.findLinks(content);
            new_post_query = {
                ...new_post_query,
                tags: tags,
                content: {
                    blocks: [{
                        "type": "paragraph",
                        "data": {
                            "text": content
                        }
                    }]
                }
            }
            if(link) {
                new_post_query.link = link;
            }
        } else if(type === "article") {
            new_post_query.content = content;
        }

        let new_entity = await strapi.services.post.create(new_post_query);
        return sanitizeEntity(new_entity, { model: strapi.models.post });

    },
    async find(ctx) {
        
        if(ctx.query.trend) {
            
            let start = new Date(), end = new Date();

            if(ctx.query.trend === "day") {
                start.setHours(0,0,0,0);
                end.setHours(23,59,59,999);
            } else if(ctx.query.trend === "week") {
                let week_ago = start.getDate() - 7;
                start.setDate(week_ago);
                end.setHours(23,59,59,999);
            } else if(ctx.query.trend === "month") {
                let month_ago = start.getDate() - 31;
                start.setDate(month_ago);
                end.setHours(23,59,59,999);
            } else {
                return ctx.response.badRequest("Invalid trend.");
            }

            delete ctx.query.trend;

            ctx.query = {
                ...ctx.query,
                createdAt_gt: start,
                createdAt_lt: end,
                _sort: 'upvote_counter:desc'
            } 

        }

        if(ctx.query.channel) {
            // replace channel slug with ID
            const find_channel = await strapi.services.channel.findOne({
                slug: ctx.query.channel   
            },[]);
            if(find_channel) {
                ctx.query.channel = [find_channel._id]
            }
        }

        // only approved posts should be returned
        ctx.query = {
            ...ctx.query,
            approved: true
        }
        
        const posts = await strapi.services.post.find(ctx.query, [{
            path: 'user',
            select: 'username',
            populate: {
                path: 'profile',
                select: 'display_name about avatar'
            }
        }, {
            path: 'channel'
        }]);
        const count = await strapi.services.post.count(ctx.query);
        const current_page = Math.ceil((ctx.query._start - 1) / ctx.query._limit) + 1;
        const total_pages = Math.ceil(count/ctx.query._limit);
        let response = posts.map(post => sanitizeEntity(post, { model: strapi.models.post }));
        return {
            count: count,
            posts: response,
            pages: total_pages,
            current: current_page
        };
    },
    async update(ctx) {

        const { id } = ctx.params;
        const { content, title, type } = ctx.request.body;
        let payload = {
            type: type,
            title: title
        }

        if(type === 'text') {
            let tags = strapi.services.post.findTags(content,ctx);
            let link = await strapi.services.post.findLinks(content);
            payload = {
                ...payload,
                blocks: [{
                    "type": "paragraph",
                    "data": {
                        "text": content
                    }
                }],
                tags: tags
            }
            if(link) payload.link = link;
        } else {
            payload.content = content;
        }

        const updated_post = await strapi.services.post.update({ 
            _id: id
        }, payload);

        return sanitizeEntity(updated_post, { model: strapi.models.post });

    },
    async vote(ctx) {
        const { weight } = ctx.request.body;
        const { id } = ctx.params; // post id

        const post = await strapi.services.post.findOne({
            _id: id
        },[]);

        if(!post) {
            return ctx.response.badRequest("Post not found.");
        }

        // check if the user has already downvoted
        let find_downvote = post.downvotes.find(downvote => downvote.toString() === ctx.state.user.id);
        // check if the user has already upvoted
        let find_upvote = post.upvotes.find(upvote => upvote.toString() === ctx.state.user.id);

        let query = {};

        if( (find_downvote && weight < 0) || (find_upvote && weight > 0) ) {
            // user is removing their vote
            if(weight > 0) {
                query = {
                    upvotes: post.upvotes.filter(upvote => upvote.toString() !== ctx.state.user.id),
                    $inc: { upvote_counter: -1 }
                }
            } else if(weight < 0) {
                query = {
                    downvotes: post.downvotes.filter(downvote => downvote.toString() !== ctx.state.user.id),
                    $inc: { downvote_counter: -1 }
                }
            }
            /**
             * Remove notification
             */ 
            const find_notification = await strapi.services.notification.findOne({
                user: ctx.state.user.id,
                post: post._id
            },[]);
            if(find_notification) {
                strapi.services.notification.delete({
                    id: find_notification._id
                });
            }
        }

        if(find_downvote && weight > 0) {
            // user is removing downvote and adding upvote
            query = {
                downvotes: post.downvotes.filter(downvote => downvote.toString() !== ctx.state.user.id),
                upvotes: [...post.upvotes, ctx.state.user.id],
                $inc: { upvote_counter: 1, downvote_counter: -1 }
            }
            /**
             * Update notification from dislike to like
             */ 
            const find_notification = await strapi.services.notification.findOne({
                user: ctx.state.user.id,
                post: post._id
            },[]);
            console.log("FOUND",find_notification)
            if(find_notification) {
                strapi.models.notification.findOneAndUpdate(
                    { _id: find_notification.id },
                    {
                        type: 'like'
                    },
                    {
                        new: true
                    }
                ).then(res => {

                })
            }

        }
        if(find_upvote && weight < 0) {
            // user is removing upvote and adding downvote
            query = {
                upvotes: post.upvotes.filter(upvote => upvote.toString() !== ctx.state.user.id),
                downvotes: [...post.downvotes, ctx.state.user.id],
                $inc: { upvote_counter: -1, downvote_counter: 1 }
            }
            /**
             * Update notification from like to dislike
             */ 
            const find_notification = await strapi.services.notification.findOne({
                user: ctx.state.user.id,
                post: post._id
            },[]);

            if(find_notification) {
                strapi.models.notification.findOneAndUpdate(
                    { _id: find_notification.id },
                    {
                        type: 'dislike'
                    },
                    {
                        new: true
                    }
                ).then(res => {
                
                })
            }
        }

        if(!find_downvote && !find_upvote) {
            // original upvote or downvote
            let notification_type;
            if(weight > 0) {
                notification_type = 'like';
                query = {
                    upvotes: [...post.upvotes, ctx.state.user.id],
                    $inc: { upvote_counter: 1 }
                }
            } else if(weight < 0) {
                notification_type = 'dislike';
                query = {
                    downvotes: [...post.downvotes, ctx.state.user.id],
                    $inc: { downvote_counter: 1 }
                }
            }
            /**
             * Add like or dislike notification
             */
            if(post.user != ctx.state.user.id) {
                strapi.services.notification.create({
                    type: notification_type,
                    user: ctx.state.user.id,
                    author: post.user,
                    post: post._id,
                    read: false
                });
            }
        }

        let updated_post = await strapi.models.post.findOneAndUpdate(
            { _id: id },
            query,
            { new: true }
        )
        /*
        .populate([{
            path: 'user',
            select: 'username',
            populate: {
                path: 'profile',
                select: 'display_name about avatar'
            }
        }])
        */

        return updated_post;

    },
    async upload(ctx) {
        const { file } = ctx.request.files;
        const { destination } = ctx.request.body;

        const allowed_destinations = ['article'];

        if(!file || !destination) {
            return ctx.response.badRequest("Some required fields were not provided.");
        }

        if(!allowed_destinations.includes(destination)) {
            return ctx.response.badRequest("Invalid request.");
        }

        let path;
        let transform;
        let resize;
        let filename = `${ctx.state.user.username}-${Math.floor(Math.random() * 10000)}` 
        if(destination === 'article') {
            path = 'articles/' + filename;
            transform = { width: 1420, height: 720, crop: "thumb" };
            resize = 2000;
        }
        let file_to_upload = await strapi.services.upload.prepFile(ctx,file,resize);
        try {
            let uploaded_image_src = await strapi.services.upload.toCloudinary(
                file_to_upload,
                path,
                transform
            );
            return uploaded_image_src;

        } catch(error) {
            return ctx.response.badRequest(error);
        }
    },
    async findOne(ctx) {
        const { id } = ctx.params; // post id

        try {
            const post = await strapi.services.post.findOne({
                _id: id
            },[{
                path: 'user',
                select: 'username',
                populate: {
                    path: 'profile',
                    select: 'display_name about avatar'
                }
            }, {
                path: 'channel'
            }]);
            return sanitizeEntity(post, { model: strapi.models.post });
        } catch(err) {
            return ctx.response.notFound("Post not found.");
        }
    },
    async delete(ctx) {
        const post = await strapi.services.post.findOne({
            _id: ctx.params.id
        }, []);
        if(!post) {
            return ctx.response.notFound("Post not found.");
        }
        if(post.user.toString() !== ctx.state.user.id) {
            return ctx.response.badRequest("You cannot perform this action.");
        }
        const deleted_post = await strapi.services.post.update({ 
            _id: ctx.params.id
        }, {
            approved: false
        });
        return sanitizeEntity(deleted_post, { model: strapi.models.post });
    }
};