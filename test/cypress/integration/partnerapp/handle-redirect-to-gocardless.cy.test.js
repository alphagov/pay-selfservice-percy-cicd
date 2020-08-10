const { getDirectDebitGatewayAccountStub } = require('../../utils/common-stubs')
const userStubs = require('../../utils/user-stubs')

describe('Connect to Go Cardless', () => {
  const userExternalId = 'cd0fa54cf3b7408a80ae2f1b93e7c16e'
  const gatewayAccountId = 'DIRECT_DEBIT:42'

  beforeEach(() => {
    cy.setEncryptedCookies(userExternalId, gatewayAccountId)
  })

  describe('Redirect to Go Cardless Fails', () => {
    beforeEach(() => {
      cy.task('setupStubs', [
        userStubs.getUserSuccess({ userExternalId, gatewayAccountId }),
        getDirectDebitGatewayAccountStub(gatewayAccountId, 'test', 'gocardless'),
        {
          name: 'redirectToGoCardlessConnectFailure'
        }
      ])
    })

    it('should display Dashboard page with error message when redirecting to GoCardless connect fails', () => {
      cy.visit('/')
      cy.get('a[href="/link-account"').click()
      cy.visit('/link-account')
      cy.get('.notification').should('have.class', 'generic-error')
      cy.get('h2').should('contain', 'There is a problem, please try again')
      cy.get('h1').should('contain', 'Connect to GoCardless')
      cy.get('a[href="/link-account"').should('exist')
    })
  })
})
