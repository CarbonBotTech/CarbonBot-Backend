'use strict';
const { sanitizeEntity } = require('strapi-utils');
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
    async add(payload) {
        const new_notification = await strapi.services.notification.create(payload);
        return sanitizeEntity(new_notification, { model: strapi.models.notification });
    }
};
