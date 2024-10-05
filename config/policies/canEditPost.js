module.exports = async (ctx, next) => {

  const { channel, title, content, type, approved } = ctx.request.body;
  const { id } = ctx.params;

  const post = await strapi.services.post.findOne({
    _id: id
  },[]);

  if(!post) {
    return ctx.response.notFound("Post not found.");
  }

  if(post.user != ctx.state.user.id) {
    return ctx.response.badRequest("You cannot perform this action.");
  }

  if(!channel || !content || !type) {
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
    return ctx.response.notFound("Channel not found.");
  }
  
  return await next();

};