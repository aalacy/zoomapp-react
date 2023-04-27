const crypto = require('crypto')
const KJUR = require('jsrsasign')

module.exports = {
  afterSerialization(text) {
    const iv = crypto.randomBytes(16)
    const aes = crypto.createCipheriv(
      'aes-256-cbc',
      process.env.REDIS_ENCRYPTION_KEY,
      iv
    )
    let ciphertext = aes.update(text)
    ciphertext = Buffer.concat([iv, ciphertext, aes.final()])
    return ciphertext.toString('base64')
  },

  beforeDeserialization(ciphertext) {
    const ciphertextBytes = Buffer.from(ciphertext, 'base64')
    const iv = ciphertextBytes.subarray(0, 16)
    const data = ciphertextBytes.subarray(16)
    const aes = crypto.createDecipheriv(
      'aes-256-cbc',
      process.env.REDIS_ENCRYPTION_KEY,
      iv
    )
    let plaintextBytes = Buffer.from(aes.update(data))
    plaintextBytes = Buffer.concat([plaintextBytes, aes.final()])
    return plaintextBytes.toString()
  },

  generateSignature(req) {
    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2

    const oHeader = { alg: 'HS256', typ: 'JWT' }

    const oPayload = {
      sdkKey: process.env.ZOOM_MEETING_SDK_KEY,
      mn: req.body.meetingNumber,
      role: req.body.role,
      iat,
      exp,
      appKey: process.env.ZOOM_MEETING_SDK_KEY,
      tokenExp: iat + 60 * 60 * 2
    }

    const sHeader = JSON.stringify(oHeader)
    const sPayload = JSON.stringify(oPayload)
    const signature = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, process.env.ZOOM_MEETING_SDK_SECRET)

    return signature;
  }
}
