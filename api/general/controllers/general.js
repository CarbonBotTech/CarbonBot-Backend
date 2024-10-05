'use strict';

const redis = require("redis");
const axios = require("axios");
const { promisify } = require("util");
//const redisClient = redis.createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});
//const getRedisAsync = promisify(redisClient.get).bind(redisClient);

const slugify = require("slugify");
const { readdirSync, rename, readFile } = require('fs');
const { resolve } = require('path');
const sharp = require('sharp');
const cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API,
    api_secret: process.env.CLOUDINARY_SECRET
});

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async getAssets(ctx) {
        let find_categories = await strapi.services.category.find({},[]);
        let find_platforms = await strapi.services.platform.find({},[]);
        let find_channels = await strapi.services.channel.find({},[]);
        let combined_assets = {
            categories: find_categories,
            platforms: find_platforms,
            channels: find_channels
        };
        return ctx.send(combined_assets);
    },
    async getNews(ctx) {
        return ctx.send([]);
    },
    async import(ctx) {

        /*
        redisClient.flushdb( function (err, succeeded) {
            console.log(err, succeeded);
        });
        */

        /*
        // Get path to image directory
        const imageDirPath = resolve(__dirname, 'bot_logos');
        // Get an array of the files inside the folder
        const files = readdirSync(imageDirPath);

        let bots = require('./bots.json');
        let bots_modified = [];

        for(let i in bots) {
            if(bots[i]["name"]) {
                bots_modified.push({
                    name: bots[i]["name"],
                    slug: slugify(bots[i]["name"], { lower: true, remove: /[*+~.,()'"!:@]/g }),
                    logo: bots[i]["logo"].split('/')[2]
                })
            }
        }
        //console.log("bots_modified",bots_modified);

        files.forEach((file,index) => {

            if(file !== '.DS_Store') { // fuck Apple OSX

                let find_file = bots_modified.find(item => item.logo === file)

                if(find_file) {
                    //console.log("find_file", file, find_file)

                    const ext = file.split('.')[1];
                    const new_name = find_file.slug + '.' + ext;

                    const oldPath = imageDirPath + `/${file}`;
                    const newPath = imageDirPath + `/matches/${new_name}`;

                    rename(oldPath, newPath, (err) => {
                        if (err) {
                            console.log("Could not rename", err, file)
                        }
                        console.log("File renamed & moved", index)
                    });

                    console.log("----------")
                }

            }

        });
        */
        /*
        // Get path to image directory
        const imageDirPath = resolve(__dirname, 'bot_logos/matches');
        // Get an array of the files inside the folder
        const files = readdirSync(imageDirPath);

        files.forEach((file) => {
            readFile(imageDirPath + '/' + file, (err, image) => {
                if (err) throw err;
                //console.log(image);
                cloudinary.v2.uploader.upload_stream({
                    resource_type: 'auto',
                    public_id: "bot_logos/" + file.split(".")[0],
                    use_filename: true,
                    unique_filename: false
                }, (error, result) => {
                    console.log(error,result)
                }).end(image)
            });

        })
        */


        /*
        let all_categories = await strapi.services.category.find({},[]);
        let all_platforms = await strapi.services.platform.find({},[]);
        let bots = require('./bots.json');
        let bots_modified = [];
        let array = []

        for(let i in bots) {

            if(bots[i]["name"]) {

                let website = '', twitter = '', facebook = '';
                Object.keys(bots[i]["links"]).forEach((key) => {

                    if(key === 'website') {
                        website = bots[i]["links"][key]
                    }
                    if(key === 'facebook') {
                        facebook = bots[i]["links"][key]
                    }
                    if(key === 'twitter') {
                        twitter = bots[i]["links"][key]
                    }

                });

                let category_id = []
                bots[i]["categories"].forEach((item) => {
                    let category = all_categories.find(item_ => item_.name === item);
                    if(category) {
                        category_id.push(category._id);
                    }
                });

                let platform_id = [];
                let links = [];

                Object.keys(bots[i]["platforms"]).forEach((key) => {
                    let platform = all_platforms.find(item_ => item_.name === key);
                    if(platform) {
                        platform_id.push(platform._id);
                        let link = {
                            url: bots[i]["platforms"][key],
                            service: platform.slug
                        }
                        links.push(link)
                    }

                })


                let slug = slugify(bots[i]["name"], { lower: true, remove: /[*+~.,()'"!?:@]/g });

                let new_bot = {
                    name: bots[i]["name"],
                    slug: slug,
                    tagline: bots[i]["tagline"],
                    about: bots[i]["description"].replace(/(<([^>]+)>)/gi, ""),
                    categories: category_id,
                    platforms: platform_id,
                    links: links,
                    website: website,
                    twitter: twitter,
                    facebook: facebook,
                    user: '5fc6cf7cfd05500015bbb9be',
                    reviews: 0,
                    rating: 0,
                    tags: [],
                    logo: 'https://res.cloudinary.com/hxwoopdw5/image/upload/v1608747208/bot_logos/' + slug + '.jpg'
                };

                strapi.services.bot.create(new_bot).then(res => {
                    console.log("New bot created", i, res)
                }).catch(err => {
                    console.log("ERROR here", i, new_bot)
                    console.log("New bot error", JSON.stringify(err.data))
                });

            }

        }

        return ctx.send("done")
        */

    }
};

/*
client.flushdb( function (err, succeeded) {
    console.log(err, succeeded);
});
*/
