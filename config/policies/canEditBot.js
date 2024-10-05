module.exports = async (ctx, next) => {

  const bot = await strapi.services.bot.findOne({
    _id: ctx.params.id
  },[]);

  if(!bot) {
    return ctx.response.badRequest("Bot not found.");
  }

  if(bot.user != ctx.state.user.id) {
    return ctx.response.badRequest("You cannot perform this action.");
  }
  
  return await next();

};