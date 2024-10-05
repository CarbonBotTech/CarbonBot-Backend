module.exports = async (ctx, next) => {

  const { score, content, bot } = ctx.request.body

  if(!score || !content || !bot) {
    return ctx.response.badRequest("Some required fields were not supplied.");
  }

  if(parseInt(score) < 1 || parseInt(score) > 5) {
    return ctx.response.badRequest("Invalid score");
  }

  const find_bot = await strapi.services.bot.findOne({
    _id: bot
  },[]);

  if(!find_bot) {
    return ctx.response.badRequest("Bot not found.");
  }
  
  return await next();

};