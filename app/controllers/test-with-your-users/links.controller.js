'use strict'

const logger = require('../../utils/logger')(__filename)
const { response } = require('../../utils/response.js')
const paths = require('../../paths')
const productsClient = require('../../services/clients/products.client.js')
const { renderErrorView } = require('../../utils/response.js')

module.exports = (req, res) => {
  const params = {
    productsTab: true,
    createPage: paths.prototyping.demoService.create,
    indexPage: paths.prototyping.demoService.index,
    linksPage: paths.prototyping.demoService.links
  }

  productsClient.product.getByGatewayAccountId(req.account.gateway_account_id)
    .then(products => {
      const prototypeProducts = products.filter(product => product.type === 'PROTOTYPE')
      params.productsLength = prototypeProducts.length
      params.products = prototypeProducts
      return response(req, res, 'dashboard/demo-service/index', params)
    })
    .catch((err) => {
      logger.error(`[requestId=${req.correlationId}] Get PROTOTYPE product by gateway account id failed - ${err.message}`)
      renderErrorView(req, res)
    })
}
