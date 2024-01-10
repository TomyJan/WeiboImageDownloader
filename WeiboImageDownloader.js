import http from 'http'
import fs from 'fs'
import path from 'path'
import logger from './Tools/logger.js'
import config from './Tools/config.js'

logger.info('WeiboImageDownloader starting...')

logger.setLogLevel(config.logLevel)

// 从config提供的文件名读取文件列表
const imgList = fs.readFileSync(config.imgUrlMapFile, 'utf-8').split('\n')
// logger.debug('imgList: ', imgList)

// 创建下载目录
if (!fs.existsSync(config.downloadPath)) {
  fs.mkdirSync(config.downloadPath)
}

// 下载图片
let downloadCount = 0
let downloadSuccessCount = 0
let downloadFailedCount = 0
let downloadFailedList = []
let downloadSuccessList = []
let downloadFailedListFile = path.join(
  config.downloadPath,
  'downloadFailedList.txt'
)
let downloadSuccessListFile = path.join(
  config.downloadPath,
  'downloadSuccessList.txt'
)
for (const imgUrl of imgList) {
  if (imgUrl === '') {
    continue
  }
  downloadCount++
  const imgFileName = imgUrl + '.jpg'
  const imgFilePath = path.join(config.downloadPath, imgFileName)
  logger.debug('imgFilePath: ', imgFilePath)
  if (fs.existsSync(imgFilePath)) {
    logger.debug('文件已存在，跳过下载')
    downloadSuccessCount++
    downloadSuccessList.push(imgUrl)
    continue
  }
  logger.debug('文件不存在，开始下载')
  const downloadStartTime = new Date().getTime()
  const downloadRsp = await download(
    `http://tvax1.sinaimg.cn/large/${imgUrl}.jpg`,
    imgFilePath
  )
  const downloadEndTime = new Date().getTime()
  if (downloadRsp.code === 0) {
    logger.info(
      '下载成功，耗时',
      (downloadEndTime - downloadStartTime) / 1000,
      '秒'
    )
    downloadSuccessCount++
    downloadSuccessList.push(imgUrl)
  } else {
    logger.warn(
      '下载失败，错误码',
      downloadRsp.code,
      '，错误信息',
      downloadRsp.msg
    )
    downloadFailedCount++
    downloadFailedList.push(imgUrl)
  }
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
function download(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath)
    http
      .get(
        url,
        {
          Referer:
            'http://weibo.com/u/1699432410?refer_flag=1001030103_&is_all=1',
        },
        (response) => {
          response.pipe(file)
          file.on('finish', () => {
            file.close()
            resolve({ code: 0, msg: 'success' })
          })
        }
      )
      .on('error', (err) => {
        fs.unlinkSync(filePath)
        reject({ code: -1, msg: err.message })
      })
  })
}
