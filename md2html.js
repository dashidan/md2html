"use strict";
const fs = require('fs');
const showdown = require('sinbad_showdown');
const Handlebars = require("handlebars");
const moment = require('moment');

const article_type = process.argv[2];
const article_path_sub_folder = process.argv[3];
const article_base_folder = "D:/workplace/git/Doc/educate/";
const article_folder = article_base_folder + article_type;

const css_bootstrap = "D:/workplace/git/amp.dsd/css/bootstrap.css";
const css_dashidan = "D:/workplace/git/amp.dsd/css/dashidan.css";

/** 默认转化pc页面*/
let convertType = "pc";
if (process.argv.length > 4) {
    /** 转化类型 可选[mip, amp]*/
    convertType = process.argv[4];
    if (convertType != "mip" && convertType != "amp") {
        console.log('error 参数错误 convertType:' + convertType);
        return;
    }
}

/** 生成的html文件目录*/
let htmlOutBaseFolder;
if (convertType == "mip") {
    /** mip 格式文件目录*/
    htmlOutBaseFolder = "D:/workplace/git/mip.dsd/article/";
} else if (convertType == "amp") {
    htmlOutBaseFolder = "D:/workplace/git/amp.dsd/article/";
} else {
    /** pc默认格式文件目录*/
    htmlOutBaseFolder = "D:/workplace/git/Doc/dashidan.com/article/";
}

/**
 *
 * allFileName数据格式
 *
 * {
 *  {
 *      "sub_folder":"basic",
 *      "category":"Javar入门到精通"，
 *      "article": [
 *          {
 *              "md":xxxxx/1.md,
 *              "fileNum":1,
 *              "fileName": Java教程简介
 *          }
 *      ]
 *  }
 * }
 * @type {Array}
 */
let allFileName = [];
getAllFolderFileName(article_folder);

function getAllFolderFileName(folderName, sub_folder) {
    console.log("readFolder folderName : " + folderName + " sub_folder: " + sub_folder);
    let files = fs.readdirSync(folderName);
    files.forEach(function (file) {
        let sub_file = folderName + '/' + file;
        let stat = fs.statSync(sub_file);
        if (stat.isDirectory()) {
            getAllFolderFileName(sub_file, file);
        } else {
            if (sub_file.endsWith('.md')) {
                let fileNumber = getFileNumber(file);
                if (fileNumber) {
                    /** 只获取已经添加数字的文件,这个数字是从1开始的*/
                    console.log(" sub_folder: " + sub_folder + " fileNumber: " + fileNumber + " sub_file: " + sub_file);
                    let contain = false;
                    for (let index in allFileName) {
                        if (allFileName[index].sub_folder === sub_folder) {

                            let articleInfo = {};
                            articleInfo.md = sub_file;
                            articleInfo.fileNum = fileNumber;
                            articleInfo.fileName = file.replace(".md", "");

                            allFileName[index]["article"][fileNumber] = articleInfo;
                            contain = true;
                        }
                    }
                    if (!contain) {
                        let cateGoryInfo = require(folderName + "/title.json");
                        let info = {};
                        info.sub_folder = sub_folder;
                        info.category = cateGoryInfo.title;
                        info.article = [];

                        let articleInfo = {};
                        articleInfo.md = sub_file;
                        articleInfo.fileNum = fileNumber;
                        articleInfo.fileName = file.replace(".md", "");

                        info.article[fileNumber] = articleInfo;
                        let index = cateGoryInfo.index;
                        if (allFileName[index]) {
                            console.log("title.json 文件中的index冲突: " + cateGoryInfo + " allFileName[index] "
                                        + allFileName[index]);
                        }
                        allFileName[index] = info;
                    }
                }
            }
        }
    });
}

console.log("allFileName: " + allFileName);

readFolder(article_path_sub_folder);

/**
 * 读取目录中的MD文件
 * @param folderName
 */
function readFolder() {
    console.log("readFolder folderName : " + article_path_sub_folder);
    for (let index in allFileName) {
        if (allFileName[index]["sub_folder"] == article_path_sub_folder) {

            let outFolder = htmlOutBaseFolder + article_type + "/" + article_path_sub_folder;
            let exist = fs.existsSync(htmlOutBaseFolder + article_type);
            if (!exist) {
                fs.mkdirSync(htmlOutBaseFolder + article_type);
            }

            exist = fs.existsSync(htmlOutBaseFolder + article_type + "/" + article_path_sub_folder);
            if (!exist) {
                fs.mkdirSync(htmlOutBaseFolder + article_type + "/" + article_path_sub_folder);
            }

            for (let i = 1; i < allFileName[index]["article"].length; i++) {
                let outHtmlFileName = outFolder + "/" + i + ".html";
                let fileNameArr = allFileName[index]["article"][i]["md"].split("/");
                let fileName = fileNameArr[fileNameArr.length - 1];
                convertFile(allFileName[index]["article"][i]["md"], outHtmlFileName, fileName);
            }
        }
    }

    let outHtmlFile = htmlOutBaseFolder + article_type + "/index.html";
    let descFile = require(article_folder + "/desc.json");
    convertIndex(outHtmlFile, descFile);
}

/**
 * Mardown文件转化为html文件
 * @param mdFile
 * @param outHtmlFile
 */
function convertFile(mdFile, outHtmlFile, fileName) {
    const mdData = fs.readFileSync(mdFile, 'utf-8');
    let converter = new showdown.Converter({"convertType": convertType});
    let htmlData = converter.makeHtml(mdData);
    let descriptionFileName = mdFile.replace('.md', '.json');
    /** 不转化index.md, 采用单独的模板, 这里只转化文章内容*/
    console.log("-------------------------------------------------------");
    console.log("convertFile " + mdFile + " to: " + outHtmlFile);
    console.log("-------------------------------------------------------");
    const num = parseInt(fileName.split('.')[0]);
    /** 输出文件名去掉"1.", 只用"."后边的文件名, 这样调整顺序时, 不影响文章的索引*/
    const fileShowName = removeFileNumberAndSuffix(fileName);
    if (fileShowName) {
        /** 配置表中加入其它参数*/
        let article_config = {};
        article_config.title = fileShowName;
        article_config.content = htmlData;
        article_config.last = getFileByNum(article_type, num - 1);
        article_config.next = getFileByNum(article_type, num + 1);
        article_config.nextNum = num + 1;
        article_config.article_type = article_type;
        article_config.sub_folder = article_path_sub_folder;
        /** 获取二级目录导航*/
        article_config.fileName = fileShowName;
        article_config.fileNum = num;
        article_config.description = require(descriptionFileName);
        /** 读取handlebars模板数据*/
        let mustache_data;
        if (convertType == "mip") {
            /** mip读取template_article_mip.hbs*/
            mustache_data = fs.readFileSync("template_article_mip.hbs", 'utf-8');
            article_config.css_bootstrap = fs.readFileSync(css_bootstrap, 'utf-8');
            article_config.css_dashidan = fs.readFileSync(css_dashidan, 'utf-8');
        } else if (convertType == "amp") {
            /** amp*/
            mustache_data = fs.readFileSync("template_article_amp.hbs", 'utf-8');
            article_config.css_bootstrap = fs.readFileSync(css_bootstrap, 'utf-8');
            article_config.css_dashidan = fs.readFileSync(css_dashidan, 'utf-8');
        } else {
            /** 默认pc文件 读取template_article.hbs*/
            mustache_data = fs.readFileSync("template_article.hbs", 'utf-8');
        }
        /** 格式化时间*/
        article_config.date_published = moment(new Date()).format('YYYY-MM-DDTHH:mm:ss');
        /** 指定目录全部文件名*/
        article_config.all_file_name = allFileName;
        /** 转化为html数据*/
        const compiled = Handlebars.compile(mustache_data);
        let firstHtmlData = compiled(article_config);
        /** 写入文件*/
        fs.writeFileSync(outHtmlFile, firstHtmlData);
        console.log("OK.");
    } else {
        console.warn("忽略没有加序号的文件 mdFile: " + mdFile);
    }
}

/**
 * 转化索引文件
 */
function convertIndex(outHtmlFile, descFile) {
    /** 只转化文章索引*/
    console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    console.log("convertIndex outHtmlFile " + outHtmlFile);
    console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    let article_config = {};
    article_config.description = descFile;
    article_config.article_type = article_type;
    article_config.sub_folder = article_path_sub_folder;
    /** 读取handlebars模板数据*/
    let mustache_data;
    if (convertType == "mip") {
        /** mip读取template_article_mip.hbs*/
        mustache_data = fs.readFileSync("template_index_mip.hbs", 'utf-8');
        article_config.css_bootstrap = fs.readFileSync(css_bootstrap, 'utf-8');
        article_config.css_dashidan = fs.readFileSync(css_dashidan, 'utf-8');
    } else if (convertType == "amp") {
        /** amp*/
        mustache_data = fs.readFileSync("template_index_amp.hbs", 'utf-8');
        article_config.css_bootstrap = fs.readFileSync(css_bootstrap, 'utf-8');
        article_config.css_dashidan = fs.readFileSync(css_dashidan, 'utf-8');
    } else {
        /** 读取template_article.hbs*/
        mustache_data = fs.readFileSync("template_index.hbs", 'utf-8');
    }
    /** 格式化时间*/
    article_config.date_published = moment(new Date()).format('YYYY-MM-DDTHH:mm:ss');
    /** 指定目录全部文件名*/
    article_config.all_file_name = allFileName;
    /** 转化为html数据*/
    const compiled = Handlebars.compile(mustache_data);
    let firstHtmlData = compiled(article_config);
    /** 写入文件*/
    fs.writeFileSync(outHtmlFile, firstHtmlData);
    console.log("OK.");
}

/**
 * 获取上一篇链接
 * @param num
 * @return {*}
 */
function getFileByNum(article_type, num) {
    for (let index in allFileName) {
        if (allFileName[index]["sub_folder"] == article_type) {
            if (num >= 1 && num < allFileName[index]["article"].length) {
                return removeFileNumberAndSuffix(allFileName[index]["article"][num]["md"]);
            }
        }
    }
    return null;
}

/**
 * 输出文件名去掉"1.", 只用"."后边的文件名, 这样调整顺序时, 不影响文章的索引
 * 移除后缀名
 * 文件名必修以"数字"+"."开始, 否则会错
 */
function removeFileNumberAndSuffix(fileName) {
    const fileNumber = fileName.split('.')[0];
    let intFileNumber = parseInt(fileName);
    if (intFileNumber) {
        /** 首字母是数字*/
        /**  移除第一个点之前的字符, 然后组合字符串*/
        let removeNumberStr = fileName.replace(fileNumber + '.', '');
        /** 移除文件后缀*/
        return removeNumberStr.replace('.md', '');
    } else {
        /** 首字母不是数字, 忽略该文件*/
        return null;
    }
}

/**
 * 输出文件名采用数字
 * 移除后缀名
 * 文件名必修以"数字"+"."开始, 否则会错
 */
function getFileNumber(fileName) {
    const fileNumber = fileName.split('.')[0];
    let intFileNumber = parseInt(fileNumber);
    if (intFileNumber) {
        /** 首字母是数字*/
        return intFileNumber;
    } else {
        /** 首字母不是数字, 忽略该文件*/
        return null;
    }
}