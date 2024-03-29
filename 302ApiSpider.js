import fs from 'fs'
import fetch from 'node-fetch'
import logger from './Tools/logger.js'

// 修改这里的配置再运行
const ApiUrl = 'https://api.his.tld/api/img?type=302'
const imgListFile = './download/his-imgs.txt'

// 从文件读入链接数组
let imgList = []
if (fs.existsSync(imgListFile)) {
  imgList = fs.readFileSync(imgListFile, 'utf-8').split(/\r?\n/)
} else {
  logger.error(`图片数组文件不存在`)
  exit(1)
}

// 取url 302 结果, 不存在就存入数组并更新文件

while (1) {
  try {
    logger.info('当前已有', imgList.length, '张图片, 准备获取图片')
    let imgUrl = ''
    imgUrl = await getImgUrl(ApiUrl)
    if (imgUrl !== null) {
      if (imgList.indexOf(imgUrl) === -1) {
        imgList.push(imgUrl)
        fs.writeFileSync(imgListFile, imgList.join('\n'), 'utf-8')
        logger.info('新增图片:', imgUrl)
      } else {
        logger.debug('图片已存在:', imgUrl)
      }
    } else {
      const randomInRange = Math.floor(Math.random() * (50 - 30 + 1)) + 30
      logger.error('获取失败, 等待', randomInRange, 's 后重试...')
      await delay(randomInRange * 1000)
    }

    // 延迟4-8s继续
    const randomInRange = Math.floor(Math.random() * (8000 - 4000 + 1)) + 4000
    await delay(randomInRange)
  } catch (error) {
    // 捕获错误并处理
    const randomInRange = Math.floor(Math.random() * (10 - 5 + 1)) + 5
    logger.error(
      '发生错误: ',
      error.message,
      '，等待',
      randomInRange,
      's 后重试...'
    )
    await delay(randomInRange * 1000)
  }
}

async function getImgUrl(url) {
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve({ timeout: true })
    }, 5000) // 设置超时时间为5秒
  })

  const rspPromise = fetch(url, {
    method: 'GET',
    redirect: 'manual',
  })

  const rsp = await Promise.race([timeoutPromise, rspPromise])

  if (rsp.timeout) {
    logger.error(`请求超时...`)
    return null
  }

  if (rsp.status === 302) {
    return rsp.headers.get('location')
  } else {
    logger.error(`请求失败: ${url}, ${rsp.status} ${rsp.statusText}`)
    return null
  }
}

async function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
