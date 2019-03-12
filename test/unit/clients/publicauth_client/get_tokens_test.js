'use strict'

// npm dependencies
const Pact = require('pact')
const path = require('path')
const chai = require('chai')
const {expect} = chai
const chaiAsPromised = require('chai-as-promised')

// user dependencies
const gatewayAccountFixtures = require('../../../fixtures/gateway_account_fixtures')
const publicauthClient = require('../../../../app/services/clients/public_auth_client')
const PactInteractionBuilder = require('../../../fixtures/pact_interaction_builder').PactInteractionBuilder

// constants
const port = Math.floor(Math.random() * 48127) + 1024
const TOKENS_PATH = '/v1/frontend/auth'

chai.use(chaiAsPromised)

describe('publicauth client - get tokens', function () {
  let provider = Pact({
    consumer: 'selfservice-to-be',
    provider: 'publicauth',
    port: port,
    log: path.resolve(process.cwd(), 'logs', 'mockserver-integration.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    spec: 2,
    pactfileWriteMode: 'merge'
  })

  before(() => provider.setup())
  after((done) => provider.finalize().then(() => { done() }))

  process.env.PUBLIC_AUTH_URL = `http://localhost:${port}${TOKENS_PATH}`

  describe('success', () => {
    const params = {
      accountId: 42
    }

    const getServiceAuthResponse = gatewayAccountFixtures.validGatewayAccountTokensResponse(params)

    before((done) => {
      provider.addInteraction(
        new PactInteractionBuilder(`${TOKENS_PATH}/${params.accountId}`)
          .withState(`Gateway account ${params.accountId} exists in the database`)
          .withUponReceiving('a valid service auth request')
          .withResponseBody(getServiceAuthResponse.getPactified())
          .build()
      ).then(() => { done() })
    })

    afterEach((done) => provider.verify().then(() => { done() }))

    it('should return service tokens information successfully', function (done) {
      const expectedTokensData = getServiceAuthResponse.getPlain()

      publicauthClient.getActiveTokensForAccount(params).then(function (tokens) {
        expect(tokens).to.deep.equal(expectedTokensData)
        done()
      })
    })
  })
})
