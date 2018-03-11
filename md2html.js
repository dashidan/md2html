"use strict";
const fs = require('fs');
const path = require("path");
const showdown = require('sinbad_showdown');
const Handlebars = require("handlebars");
var moment = require('moment');

const article_type = process.argv[2];
const article_path_sub_folder = process.argv[3];
const mdParam = "D:/workplace/git/Doc/educate/" + article_type + "/" + article_path_sub_folder;

const css_bootstrap = "D:/workplace/git/amp.dsd/css/bootstrap.css";
const css_dashidan = "D:/workplace/git/amp.dsd/css/dashidan.css";

/** 默认转化pc页面*/
let convertType = "pc";
if (process.argv.length > 4) {
    /** 转化类型 可选[mip, amp]*/
    convertType = process.argv[4];

    if(convertType != "mip" && convertType != "amp") {
        console.log('error 参数错误 convertType:' + convertType);
        return;
    }
}

/** 生成的html文件目录*/
let htmlParam;
/** 文章目录索引*/
let article_index;
if (convertType == "mip") {
    /** mip 格式文件目录*/
    htmlParam = "D:/workplace/git/mip.dsd/article/" + article_type + "/" + article_path_sub_folder;
} else if(convertType == "amp") {
    htmlParam = "D:/workplace/git/amp.dsd/article/" + article_type + "/" + article_path_sub_folder;
} else {
    /** pc默认格式文件目录*/
    htmlParam = "D:/workplace/git/Doc/dashidan.com/article/" + article_type + "/" + article_path_sub_folder;
    article_index = "D:/workplace/git/Doc/dashidan.com/index_template/" + article_type + ".html";
}

var allFileName = [];
getAllFolderFileName(mdParam);

function getAllFolderFileName(folderName) {
    console.log("readFolder folderName : " + folderName);
    fs.readdir(folderName, function (err, files) {
        if (err) {
            console.log('error:\n' + err);
            return;
        }
        files.forEach(function (file) {
            if (file.endsWith('.md')) {
                allFileName.push(file);
            }
        });
    });
}

console.log("allFileName: " + allFileName);

readFolder(mdParam);

/**
 * 读取目录中的MD文件
 * @param folderName
 */
function readFolder(folderName) {
    console.log("readFolder folderName : " + folderName);
    fs.readdir(folderName, function (err, files) {
        if (err) {
            console.log('error:\n' + err);
            return;
        }
        files.forEach(function (file) {
            fs.stat(folderName + '/' + file, function (err, stat) {
                if (err) {
                    console.log(err);
                    return;
                }
                if (stat.isDirectory()) {
                    console.log("isDirectory stat : " + stat);
                    readFolder(folderName + '/' + file);
                } else {
                    if (file.endsWith('.md')) {
                        let mdFile = folderName + '/' + file;
                        let outFileName = null;
                        if (folderName === mdParam) {
                            /** 输出文件名去掉"1.", 只用"."后边的文件名, 这样调整顺序时, 不影响文章的索引*/
                            const fileNumber = getFileNumber(file);
                            if (fileNumber) {
                                outFileName = htmlParam + '/' + fileNumber + '.html';
                            }
                        } else {
                            let subFulder = folderName.replace(mdParam + "/", '');
                            let outFolder = htmlParam + '/' + subFulder;
                            let exist = fs.existsSync(outFolder);
                            if (!exist) {
                                console.log('not exist make dir outFolder :' + outFolder);
                                fs.mkdirSync(outFolder);
                            }

                            /** 输出文件名去掉"1.", 只用"."后边的文件名, 这样调整顺序时, 不影响文章的索引*/
                            const fileNumber = getFileNumber(file);
                            if (fileNumber) {
                                outFileName = htmlParam + '/' + fileNumber + '.html';
                            }
                        }
                        folderName.trim();
                        if (outFileName) {
                            console.log('mdFile:' + mdFile + ' outFileName :' + outFileName);
                            convertFile(mdFile, outFileName, file);
                        } else {
                            console.warn('文件名不合法, 忽略文件 file ' + file);
                        }
                    }
                }
            });
        });
    });
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
    let outFolder = path.dirname(outHtmlFile);
    let descriptionFileName = mdFile.replace('.md', '.json');
    mkdirs(outFolder);
    /** 不转化index.md, 采用单独的模板, 这里只转化文章内容*/
    console.log("-------------------------------------------------------");
    console.log("convertFile fileName " + fileName);
    console.log("-------------------------------------------------------");
    const num = parseInt(fileName.split('.')[0]);
    /** 输出文件名去掉"1.", 只用"."后边的文件名, 这样调整顺序时, 不影响文章的索引*/
    const fileShowName = removeFileNumberAndSuffix(fileName);
    if (fileShowName) {
        /** 配置表中加入其它参数*/
        let article_config = {};
        article_config.title = fileShowName;
        article_config.content = htmlData;
        article_config.last = getLast(num);
        article_config.next = getNext(num);
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
        } else if(convertType == "amp") {
            /** amp*/
            mustache_data = fs.readFileSync("template_article_amp.hbs", 'utf-8');
            article_config.css_bootstrap = fs.readFileSync(css_bootstrap, 'utf-8');
            article_config.css_dashidan = fs.readFileSync(css_dashidan, 'utf-8');
        } else {
            /** 默认pc文件 读取template_article.hbs*/
            mustache_data = fs.readFileSync("template_article.hbs", 'utf-8');
            /** 获取索引*/
            let index_data = fs.readFileSync(article_index, 'utf-8');
            article_config.index_data = index_data;
        }

        article_config.date_published = moment(new Date()).format('YYYY-MM-DDTHH:mm:ss'); /*格式化时间*/
        // article_config.date_published = new Date().Format("yyyy-MM-ddTHH:mm:ss\"));
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
 * 递归创建目录
 * @param dirPath 创建目录名
 */
function mkdirs(dirPath) {
    if (!fs.existsSync(dirPath)) {
        let dirName = path.dirname(dirPath);
        let exist = fs.existsSync(dirName);
        if (exist) {
            fs.mkdirSync(dirPath);
        } else {
            mkdirs(dirName);
        }
    }
}

/**
 * 获取上一篇链接
 * @param num
 * @return {*}
 */
function getLast(num) {
    const lastNum = num - 1;
    const lastFileStart = lastNum + ".";

    let i = 0, length = allFileName.length;
    for (; i < length; i++) {
        if (allFileName[i].startsWith(lastFileStart)) {
            const fileShowName = removeFileNumberAndSuffix(allFileName[i]);
            if (fileShowName) {
                return fileShowName;
            }
        }
    }
    return null;
}

/**
 * 获取下一篇链接
 * @param num
 * @return {*}
 */
function getNext(num) {
    const nextNum = num + 1;
    const nextFileStart = nextNum + ".";

    let i = 0, length = allFileName.length;
    for (; i < length; i++) {
        if (allFileName[i].startsWith(nextFileStart)) {
            const fileShowName = removeFileNumberAndSuffix(allFileName[i]);
            if (fileShowName) {
                return fileShowName;
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