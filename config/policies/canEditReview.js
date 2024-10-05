module.exports = async (ctx, next) => {
  
  const { score, content } = ctx.request.body;

  if(!score || !content) {
    return ctx.response.badRequest("Some required fields were not supplied.");
  }

  if(parseInt(score) < 1 || parseInt(score) > 5) {
    return ctx.response.badRequest("Invalid score");
  }

  const find_review = await strapi.services.review.findOne({
    _id: ctx.params.id
  },[]);

  if(!find_review) {
    return ctx.response.badRequest("Review not found.");
  }

  if(find_review.user.toString() !== ctx.state.user.id) {
    return ctx.response.badRequest("You cannot perform this action.");
  }

  return await next();

};