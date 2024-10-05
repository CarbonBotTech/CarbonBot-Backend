'use strict';
const slugify = require('slugify');
/**
 * `slugify` service.
 */

module.exports = {
  /**
   * Make sure slug is unique
   * @param {string} name 
   * @param {string} model 
   */
  async generateSlug(name,model) {
    let slug = slugify(name, {
      lower: true,
      remove: /[*+~.,()'"!:@]/g
    },[]);
    const find_slug = await strapi.services[model].findOne({
      slug: slug
    });
    if(find_slug) {
      // slug's not unique. randomize it
      slug = `${slug}-${Math.floor(Math.random() * 100000)}` 
    }
    return slug;
  },
  /**
   * When entity is being updated, make sure slug is still unique
   * @param {string} name 
   * @param {string} model 
   */
  async validateSlug(name,model,entity_id) {
    let slug = slugify(name, {
      lower: true,
      remove: /[*+~.,()'"!:@]/g
    });
    const find_slug = await strapi.services[model].findOne({
      slug: slug
    });
    if(find_slug && find_slug._id != entity_id) {
      // slug is being used by somebody else
      slug = `${slug}-${Math.floor(Math.random() * 100000)}`;
    } else {
      // no conflicts
      slug = slug;
    }
    return slug;
  }
};
