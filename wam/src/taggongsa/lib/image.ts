/** 인증 사진을 작게 줄여 data URL로 만든다. 저장 용량을 아끼기 위함이다. */
export function downscaleImage(file: File, maxSize = 560): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('이미지를 읽지 못했어요'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('이미지를 열지 못했어요'))
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        const context = canvas.getContext('2d')
        if (!context) {
          resolve(String(reader.result))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
