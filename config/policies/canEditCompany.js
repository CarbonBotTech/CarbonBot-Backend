module.exports = async (ctx, next) => {

  if(ctx.params.id != ctx.state.user.company) {
    return ctx.response.badRequest("You cannot perform this action!");
  }

  return await next();

};