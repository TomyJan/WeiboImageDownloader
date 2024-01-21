import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import logger from './Tools/logger.js'
import config from './Tools/config.js'

logger.info('WeiboImageDownloader starting...')

logger.setLogLevel(config.logLevel)

// 从config提供的文件名读取文件列表
const imgList = fs.readFileSync(config.imgUrlMapFile, 'utf-8').split(/\r?\n/)
// logger.debug('imgList: ', imgList)

// 创建下载目录
if (!fs.existsSync(config.downloadPath + '/' + config.downloadSize)) {
  fs.mkdirSync(config.downloadPath + '/' + config.downloadSize, {
    recursive: true,
  })
}

// 下载图片
let downloadCount = 0
let downloadSuccessCount = 0
let downloadFailedCount = 0
let downloadFailedList = []
let downloadSuccessList = []
let downloadFailedListFile = path.join(
  config.downloadPath,
  `${config.downloadSize}-downloadFailedList.txt`
)
let downloadSuccessListFile = path.join(
  config.downloadPath,
  `${config.downloadSize}-downloadSuccessList.txt`
)
for (const imgUrl of imgList) {
  logger.info(
    '准备下载第',
    downloadCount + 1,
    '/',
    imgList.length,
    '个文件: ',
    imgUrl
  )
  if (imgUrl === '') {
    logger.warn('文件URL为空，跳过下载')
    continue
  }
  downloadCount++
  const imgFileName = imgUrl + '.jpg'
  const imgFilePath = path.join(
    config.downloadPath,
    config.downloadSize,
    imgFileName
  )
  // logger.debug('imgFilePath: ', imgFilePath)
  if (fs.existsSync(imgFilePath)) {
    logger.debug('文件已存在，跳过下载')
    downloadSuccessCount++
    downloadSuccessList.push(imgUrl)
    continue
  }
  logger.debug('文件不存在，开始下载')
  const downloadStartTime = new Date().getTime()
  try {
    const downloadRsp = await download(`http://tvax1.sinaimg.cn/${config.downloadSize}/${imgUrl}.jpg`, imgFilePath)

    if (downloadRsp.code === 0) {
      logger.info(`下载成功，耗时 ${(new Date().getTime() - downloadStartTime) / 1000} 秒`)
      downloadSuccessCount++
      downloadSuccessList.push(imgUrl)
    } else {
      logger.warn(`下载失败，错误码 ${downloadRsp.code}，错误信息 ${downloadRsp.msg}`)
      downloadFailedCount++
      downloadFailedList.push(imgUrl)
    }
  } catch (error) {
    logger.warn(`下载失败，错误信息 ${error.message}`)
    downloadFailedCount++
    downloadFailedList.push(imgUrl)
  }
  delay(config.downloadInterval)
}

// 保存下载失败列表
if (downloadFailedList.length > 0) {
  fs.writeFileSync(
    downloadFailedListFile,
    downloadFailedList.join('\n'),
    'utf-8'
  )
}
// 保存下载成功列表
if (downloadSuccessList.length > 0) {
  fs.writeFileSync(
    downloadSuccessListFile,
    downloadSuccessList.join('\n'),
    'utf-8'
  )
}

logger.info('下载完成，共下载', downloadCount, '个文件')
logger.info('成功下载', downloadSuccessCount, '个文件')
logger.info('失败下载', downloadFailedCount, '个文件')
if (downloadFailedCount > 0) {
  logger.info('下载失败列表已保存至', downloadFailedListFile)
}
if (downloadSuccessCount > 0) {
  logger.info('下载成功列表已保存至', downloadSuccessListFile)
}

/**
 * 下载文件
 * @param {string} url 文件URL
 * @param {string} filePath 文件保存路径
 * @returns {Promise<{code: number, msg: string}>} 下载结果
 */
async function download(url, filePath) {
  return new Promise(async (resolve, reject) => {
    const maxRetries = config.downloadRetry;
    const timeout = config.downloadTimeout;
    let retries = 0;

    async function attemptDownload() {
      try {
        const response = await Promise.race([
          fetch(url,
            {
              Referer:
                'http://weibo.com/u/1699432410?refer_flag=1001030103_&is_all=1',
            }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('请求超时')), timeout)
          ),
        ]);

        if (!response.ok) {
          logger.error('下载失败，状态码:', response.status);
        }

        const fileStream = fs.createWriteStream(filePath);
        fileStream.on('finish', function () {
          fileStream.close();
          resolve({ code: 0, msg: 'success' });
        });
        fileStream.on('error', function (err) {
          fs.unlink(filePath);
          reject(err);
        });

        await response.body.pipe(fileStream);
      } catch (error) {
        logger.error('文件下载失败:', error.message);
        reject(error);
      }
    }

    while (retries < maxRetries) {
      try {
        await attemptDownload();
        break;
      } catch (error) {
        await fs.unlink(filePath);
        retries++;
        if (retries < maxRetries) {
          await delay(config.downloadRetryDelay);
        }
      }
    }

    if (retries >= maxRetries) {
      reject(new Error('请求超时'));
    }
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
