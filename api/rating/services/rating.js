'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
    async calculateRating(bot_id) {
        
        const reviews = await strapi.services.review.find({
            bot: bot_id
        }, [{
            path: 'rating'
        }]);

        let ratings = [];
        let group_by_score = reviews.reduce((r, a) => {
            r[a.rating.score] = [...r[a.rating.score] || [], a.rating];
            return r;
        }, {});

        for (let key in group_by_score) {
            ratings.push({
                weight: parseInt(key),
                count: group_by_score[key].length
            })
        }

        let totalWeight = 0;
        let totalReviews = 0;

        for(let i in ratings) {
            let weightMultipliedByNumber = ratings[i].weight * ratings[i].count;
            totalWeight += weightMultipliedByNumber;
            totalReviews += ratings[i].count;
        }

        return totalWeight / totalReviews;

    }
};
