module.exports = async (ctx, next) => {

  if(ctx.params.id != ctx.state.user.id) {
    return ctx.response.badRequest("You cannot perform this action!");
  }

  return await next();

};