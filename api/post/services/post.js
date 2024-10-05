'use strict';
const getUrls = require("get-urls");
const findHashtags = require('find-hashtags');
const axios = require("axios");

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
    findTags(content, ctx) {
        
        let tags = [],
	    parsed_tags = findHashtags(content);

        if(parsed_tags.length > 0) {
            tags = [...tags, ...parsed_tags]
        }

        if(tags.length > 5) {
            return ctx.response.badRequest("Error! Only 5 tags per post are allowed.");
        }

        tags.map((tag) => {

            if(tag.length >= 50) {
                return ctx.response.badRequest("Error! Some of the supplies tags are too long.");
            }

        });

        return tags;
      
    },
    async findLinks(content) {
        let links = getUrls(content, {stripWWW: false}),
        parsed_links = [...links];

        if(parsed_links.length === 0) {
            return null
        }

        let iframely_url = 'https://iframe.ly/api/oembed?url=' + parsed_links[0] + '&api_key=' + process.env.IFRAMELY_API + '&omit_script=1';

        try {
            let iframely = await axios({
                method: 'get',
                url: iframely_url
            });
            return iframely.data
        } catch(err) {
            return null
        }

    }
};