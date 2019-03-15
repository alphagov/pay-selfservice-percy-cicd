'use strict'

// NPM dependencies
const { expect } = require('chai')

// Local dependencies
const bankDetailsValidations = require('./bank-details-validations')

describe('Bank details validations', () => {
  describe('account number validations', () => {
    it('should validate successfully', () => {
      const bankAccountNumber = '00012345'

      expect(bankDetailsValidations.validateAccountNumber(bankAccountNumber).valid).to.be.true // eslint-disable-line
    })

    it('should be not valid when is empty string', () => {
      const bankAccountNumber = ''

      expect(bankDetailsValidations.validateAccountNumber(bankAccountNumber)).to.deep.equal({
        valid: false,
        message: 'This field cannot be blank'
      })
    })

    it('should be not valid for invalid account number', () => {
      const bankAccountNumber = 'abcdefgh'

      expect(bankDetailsValidations.validateAccountNumber(bankAccountNumber)).to.deep.equal({
        valid: false,
        message: 'Enter a valid account number'
      })
    })
  })

  describe('sort code validations', () => {
    it('should validate successfully', () => {
      const sortCode = '108800'

      expect(bankDetailsValidations.validateSortCode(sortCode).valid).to.be.true // eslint-disable-line
    })

    it('should be not valid when is empty string', () => {
      const sortCode = ''

      expect(bankDetailsValidations.validateSortCode(sortCode)).to.deep.equal({
        valid: false,
        message: 'This field cannot be blank'
      })
    })

    it('should be not valid for invalid sort code', () => {
      const sortCode = 'abcdef'

      expect(bankDetailsValidations.validateSortCode(sortCode)).to.deep.equal({
        valid: false,
        message: 'Enter a valid sort code'
      })
    })
  })
})