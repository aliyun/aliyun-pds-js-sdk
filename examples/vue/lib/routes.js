const tokenUtil = require('./utils/token-util')
module.exports = router => {
  // 注意： 此接口只用来做演示，因为没有任何鉴权逻辑，不要用于生产
  router.post('/token', async function (ctx, next) {
    let {user_id} = ctx.request.body
    ctx.body = await tokenUtil.getUserToken(user_id)
  })
}
