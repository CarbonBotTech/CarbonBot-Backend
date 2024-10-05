module.exports = async (ctx, next) => {

  const { content, channel, type } = ctx.request.body;

  if(!content || !channel || !type) {
    return ctx.response.badRequest("Some required fields were not supplied.");
  }

  const allowed_types = ['text', 'article'];
  if(!allowed_types.includes(type)) {
    return ctx.response.badRequest("Invalid post type.");
  }

  const find_channel = await strapi.services.channel.findOne({
    _id: channel
  },[]);

  if(!find_channel) {
    return ctx.response.badRequest("Channel not found.");
  }
  
  return await next();

};