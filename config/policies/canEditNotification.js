module.exports = async (ctx, next) => {
  
  const find_notification = await strapi.services.notification.findOne({
    _id: ctx.params.id
  },[]);

  if(!find_notification) {
    return ctx.response.badRequest("Notification not found.");
  }

  if(find_notification.author.toString() !== ctx.state.user.id) {
    return ctx.response.badRequest("You cannot perform this action.");
  }

  return await next();

};