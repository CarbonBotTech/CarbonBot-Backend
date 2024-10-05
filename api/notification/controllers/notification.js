'use strict';
const { sanitizeEntity } = require('strapi-utils');
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async find(ctx) {
        let query = {
            ...ctx.query,
            author: ctx.state.user.id
        };
        const notifications = await strapi.services.notification.find(query, [{
            path: 'user',
            select: 'username',
            populate: {
                path: 'profile',
                select: 'display_name about avatar'
            }
        }, {
            path: 'bot'
        },{
            path: 'review'
        }, {
            path: 'post'
        },{
            path: 'comment'
        },{
            path: 'reply'
        },{
            path: 'collection_'
        }]);

        const count = await strapi.services.notification.count(query);
        const current_page = Math.ceil((query._start - 1) / query._limit) + 1;
        const total_pages = Math.ceil(count/query._limit);

        let response = notifications.map(notification => sanitizeEntity(notification, { model: strapi.models.notification }));
        return {
            count: count,
            notifications: response,
            pages: total_pages,
            current: current_page
        };
    },
    async count(ctx) {
        const count = await strapi.services.notification.count({
            author: ctx.state.user.id,
            read: false
        });
        return sanitizeEntity(count, { model: strapi.models.notification });
    },
    async update(ctx) {
        const updated_notification = await strapi.models.notification.findOneAndUpdate(
            { _id: ctx.params.id },
            {
                read: true
            },
            {
                new: true
            }
        );
        return sanitizeEntity(updated_notification, { model: strapi.models.notification });
    },
    async updateAll(ctx) {
        const updated_notifications = await strapi.models.notification.updateMany(
            { author: ctx.state.user.id },
            { $set: { read: true } }
        );
        return 0;
    }
};
