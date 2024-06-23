import fetch from 'node-fetch'
import fs from 'fs'

let getCNImg = true // 国服/国际服

let url = getCNImg
  ? 'https://media-cdn-zspms.kurogame.com/pnswebsite/website2.0/json/G144/MainMenu.json?t=' +
    Date.now()
  : 'https://media-cdn-zspms.kurogame.net/pnswebsite/website2.0/json/G167/MainMenu.json?t=' +
    Date.now()

const response = await fetch(url)
const json = await response.json()
const pictureList = json.picture
// 从 pictureList 里面取出所有 pictureType = 11 的成员构建 wallpaperList
const wallpaperList = pictureList.filter(
  (picture) => picture.pictureType === 11
)
// 从 wallpaperList 里面取出所有 imgUrl 构建 wallpaperUrlList
const wallpaperUrlList = wallpaperList.map((wallpaper) => wallpaper.imgUrl)
// 将 wallpaperUrlList 保存到文件, 一行一个
getCNImg
  ? fs.writeFileSync(
      'wallpaperUrlListCN.txt',
      wallpaperUrlList.join('\n'),
      'utf-8'
    )
  : fs.writeFileSync(
      'wallpaperUrlListOS.txt',
      wallpaperUrlList.join('\n'),
      'utf-8'
    )
