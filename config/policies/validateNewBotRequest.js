const ObjectValidator = require( 'object-schema-validation' );

module.exports = async (ctx, next) => {
  
  const { categories, platforms, tags, links, company } = ctx.request.body;

  /**
   * Check if category & platform IDs are supplied
   */
  if(!categories || !platforms || categories.length === 0 || platforms.length === 0) {
    return ctx.response.badRequest("Category or platform IDs not supplied");
  }

  /**
   * Check if no more than 5 tags supplied
   */
  if(tags.length > 5) {
    return ctx.response.badRequest("Too many tags are supplied.");
  }

  /**
   * Check if no more than 5 categories supplied
   */ 

  if(categories.length > 5) {
    return ctx.response.badRequest("Too many categories are supplied.");
  }

  /**
   * Check if the supplied categories & platforms exist
   */

  const find_categories_query = {
    _id: { $in: categories }
  };
  const find_platforms_query = {
    _id: { $in: platforms }
  }

  const find_categories = await strapi.services.category.find(find_categories_query);
  const find_platforms = await strapi.services.platform.find(find_platforms_query);

  if(!find_categories || !find_platforms) {
    return ctx.response.badRequest("Category or platform not found.");
  }

  /**
   * Validate link object
   */

  const linkSchema = new ObjectValidator({
    service: { type: String, required: true },
    url: { type: String, required: true }
  });

  let is_valid;
  for(let i in links) {
    is_valid = linkSchema.validate( links[i] );
    if( !is_valid.valid || links[i].url.length > 300 ) {
      return ctx.response.badRequest("Invalid installation URL supplied."); 
    }  
  }

  /**
   * Check publishing profile
   */
  if(company) {
    const find_company = await strapi.services.company.findOne({
      user: ctx.state.user.id,
      _id: company
    },[]);
    if(!find_company) {
      return ctx.response.badRequest("Company not found."); 
    }
  }
  return await next(); // all good

};