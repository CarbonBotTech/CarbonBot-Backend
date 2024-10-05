'use strict';
const { sanitizeEntity } = require('strapi-utils');
const sanitizeUser = user =>
  sanitizeEntity(user, {
    model: strapi.query('user', 'users-permissions').model,
  });
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
	/**
	* Retrieve authenticated user.
	* @return {Object|Array}
	*/
	async me(ctx) {
		const user = ctx.state.user;


		if (!user) {
		  return ctx.badRequest(null, [{ messages: [{ id: 'No authorization header was found' }] }]);
		}

		const company = await strapi.services.company.findOne({
            user: user._id
        },[]);
		if(company) {
        	user.company = company;
		}
		
		const profile = await strapi.services.profile.findOne({
            user: user._id
        },[]);
        if(profile) {
        	user.profile = profile;
        }

		ctx.body = sanitizeUser(user);
	}

};
