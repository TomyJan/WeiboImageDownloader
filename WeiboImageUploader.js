import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import imageSize from 'image-size'
import logger from './Tools/logger.js'

// 修改这里的配置再运行
// 如果你开启了水印, 你可能需要先前往 https://weibo.com/set/prefer 关闭水印
// 如果单填 SUB 字段无法上传, 可以尝试填入完整 cookie
const weiboCookie =
  'SUB=_2A25IptdPDeRhGeBN71QY9SrFzjSIHXVr2laHrDV8PUJbkNANLWf6kW1NRHCfiSiQRqF2x3_YSqeuCWvfUSKNBOFi'
const imgPath = './image-path-to-upload'
const uploadedImgListFile = './download/uploaded-imgs.txt'

if (!fs.existsSync(imgPath)) {
  logger.error(`图片目录不存在`)
  process.exit()
}
const imgList = fs.readdirSync(imgPath)
if (imgList.length === 0) {
  logger.error(`图片目录内没有文件`)
  process.exit()
}

// 遍历imglist, 调用上传方法
let uploadedImgList = []

for (const imgFileName of imgList) {
  logger.info(
    '准备上传第',
    uploadedImgList.length + 1,
    '/',
    imgList.length,
    '个文件: ',
    imgFileName
  )
  const imgFilePath = path.join(imgPath, imgFileName)
  // logger.debug('imgFilePath: ', imgFilePath)
  if (fs.existsSync(imgFilePath)) {
    const imgUrl = await uploadImgToWeibo(imgFilePath)
    if (imgUrl !== null) {
      uploadedImgList.push(imgUrl)
      fs.writeFileSync(uploadedImgListFile, uploadedImgList.join('\n'), 'utf-8')
      logger.info('上传成功, 图片id:', imgUrl)
    } else {
      logger.error('上传失败')
    }
  } else {
    logger.warn('文件不存在，跳过上传')
  }
}

/**
 * 上传图片到微博
 * @param {string} imgFilePath 本地图片路径
 * @returns {string|null} 图片id/上传失败
 */
async function uploadImgToWeibo(imgFilePath) {
  try {
    const imageBuffer = fs.readFileSync(imgFilePath)

    // Check if the file is a valid image
    if (!isValidImage(imageBuffer)) {
      logger.error('图片文件无效: ', imgFilePath)
      return null
    }

    const base64Img = imageBuffer.toString('base64')

    let uploadUrl =
      'https://picupload.service.weibo.com/interface/pic_upload.php?mime=image%2Fjpeg&data=base64&url=0&markpos=1&logo=&nick=0&marks=1&app=miniblog' //图片上传地址

    const upImgResp = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Host: 'picupload.weibo.com',
        Origin: 'https://weibo.com',
        Cookie: weiboCookie,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: new URLSearchParams({
        b64_data: base64Img,
      }),
      credentials: 'include',
    })

    let responseData = await upImgResp.text()
    responseData = responseData.replace(/([\s\S]*)<\/script>/g, '')
    // logger.debug('responseData: ', responseData)
    let rspJson = ''
    try {
      rspJson = JSON.parse(responseData)
    } catch (error) {
      logger.error(
        '图片',
        imgFilePath,
        '上传失败, 解析返回失败: ',
        responseData
      )
      return null
    }

    const imgPid = rspJson.data.pics.pic_1.pid

    if (imgPid) {
      return imgPid
    } else {
      logger.error('图片', imgFilePath, '上传失败: ', responseData)
      return null
    }
  } catch (error) {
    logger.error('图片', imgFilePath, '上传失败: ', error)
    return null
  }
}

function isValidImage(buffer) {
  try {
    const dimensions = imageSize(buffer)
    // Add additional checks if needed (e.g., file size, image format)
    return dimensions.width > 0 && dimensions.height > 0
  } catch (error) {
    return false // Not a valid image
  }
}
