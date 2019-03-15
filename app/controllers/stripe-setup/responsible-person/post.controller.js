'use strict'

// NPM dependencies
const lodash = require('lodash')
const moment = require('moment-timezone')
const ukPostcode = require('uk-postcode')
const logger = require('winston')

// Local dependencies
const paths = require('../../../paths')
const { response, renderErrorView } = require('../../../utils/response')
const {
  validateMandatoryField, validateOptionalField, validatePostcode, validateDateOfBirth
} = require('./responsible-person-validations')
const { createPerson } = require('../../../services/clients/stripe/stripe_client')
const { ConnectorClient } = require('../../../services/clients/connector_client')
const connector = new ConnectorClient(process.env.CONNECTOR_URL)

const FIRST_NAME_FIELD = 'first-name'
const LAST_NAME_FIELD = 'last-name'
const HOME_ADDRESS_LINE1_FIELD = 'home-address-line-1'
const HOME_ADDRESS_LINE2_FIELD = 'home-address-line-2'
const HOME_ADDRESS_CITY_FIELD = 'home-address-city'
const HOME_ADDRESS_POSTCODE_FIELD = 'home-address-postcode'
const DOB_DAY_FIELD = 'dob-day'
const DOB_MONTH_FIELD = 'dob-month'
const DOB_YEAR_FIELD = 'dob-year'

const validationRules = [
  {
    field: FIRST_NAME_FIELD,
    validator: validateMandatoryField,
    maxLength: 100
  },
  {
    field: LAST_NAME_FIELD,
    validator: validateMandatoryField,
    maxLength: 100
  },
  {
    field: HOME_ADDRESS_LINE1_FIELD,
    validator: validateMandatoryField,
    maxLength: 200
  },
  {
    field: HOME_ADDRESS_LINE2_FIELD,
    validator: validateOptionalField,
    maxLength: 200
  },
  {
    field: HOME_ADDRESS_CITY_FIELD,
    validator: validateMandatoryField,
    maxLength: 100
  },
  {
    field: HOME_ADDRESS_POSTCODE_FIELD,
    validator: validatePostcode
  }
]

module.exports = (req, res) => {
  const trimField = (fieldName) => {
    return lodash.get(req.body, fieldName, '').trim()
  }

  const formFields = {}
  formFields[FIRST_NAME_FIELD] = trimField(FIRST_NAME_FIELD)
  formFields[LAST_NAME_FIELD] = trimField(LAST_NAME_FIELD)
  formFields[HOME_ADDRESS_LINE1_FIELD] = trimField(HOME_ADDRESS_LINE1_FIELD)
  formFields[HOME_ADDRESS_LINE2_FIELD] = trimField(HOME_ADDRESS_LINE2_FIELD)
  formFields[HOME_ADDRESS_CITY_FIELD] = trimField(HOME_ADDRESS_CITY_FIELD)
  formFields[HOME_ADDRESS_POSTCODE_FIELD] = trimField(HOME_ADDRESS_POSTCODE_FIELD)
  formFields[DOB_DAY_FIELD] = trimField(DOB_DAY_FIELD)
  formFields[DOB_MONTH_FIELD] = trimField(DOB_MONTH_FIELD)
  formFields[DOB_YEAR_FIELD] = trimField(DOB_YEAR_FIELD)

  const errors = validationRules.reduce((errors, validationRule) => {
    const errorMessage = validate(formFields, validationRule.field, validationRule.validator, validationRule.maxLength)
    if (errorMessage) {
      errors[validationRule.field] = errorMessage
    }
    return errors
  }, {})

  const dateOfBirthErrorMessage = validateDoB(formFields)
  if (dateOfBirthErrorMessage) {
    errors['dob'] = dateOfBirthErrorMessage
  }

  const pageData = {
    firstName: formFields[FIRST_NAME_FIELD],
    lastName: formFields[LAST_NAME_FIELD],
    homeAddressLine1: formFields[HOME_ADDRESS_LINE1_FIELD],
    homeAddressLine2: formFields[HOME_ADDRESS_LINE2_FIELD],
    homeAddressCity: formFields[HOME_ADDRESS_CITY_FIELD],
    homeAddressPostcode: formFields[HOME_ADDRESS_POSTCODE_FIELD],
    dobDay: formFields[DOB_DAY_FIELD],
    dobMonth: formFields[DOB_MONTH_FIELD],
    dobYear: formFields[DOB_YEAR_FIELD]
  }

  if (!lodash.isEmpty(errors)) {
    pageData['errors'] = errors
    return response(req, res, 'stripe-setup/responsible-person/index', pageData)
  } else if (lodash.get(req.body, 'answers-checked') === 'true') {
    return createPerson(res.locals.stripeAccount.stripeAccountId, buildStripePerson(formFields))
      .then(() => {
        return connector.setStripeAccountSetupFlag(req.account.gateway_account_id, 'responsible_person', req.correlationId)
      })
      .then(() => {
        return res.redirect(303, paths.dashboard.index)
      })
      .catch(error => {
        logger.error(`[requestId=${req.correlationId}] Error creating responsible person with Stripe - ${error.message}`)
        return renderErrorView(req, res, 'Please try again or contact support team')
      })
  } else if (lodash.get(req.body, 'answers-need-changing') === 'true') {
    pageData.homeAddressPostcode = ukPostcode.fromString(formFields[HOME_ADDRESS_POSTCODE_FIELD]).toString()
    return response(req, res, 'stripe-setup/responsible-person/index', pageData)
  } else {
    pageData.homeAddressPostcode = ukPostcode.fromString(formFields[HOME_ADDRESS_POSTCODE_FIELD]).toString()
    pageData.friendlyDateOfBirth = formatDateOfBirth(formFields[DOB_DAY_FIELD], formFields[DOB_MONTH_FIELD], formFields[DOB_YEAR_FIELD])
    return response(req, res, 'stripe-setup/responsible-person/check-your-answers', pageData)
  }
}

const buildStripePerson = (formFields) => {
  const stripePerson = {
    first_name: formFields[FIRST_NAME_FIELD],
    last_name: formFields[LAST_NAME_FIELD],
    address_line1: formFields[HOME_ADDRESS_LINE1_FIELD],
    address_city: formFields[HOME_ADDRESS_CITY_FIELD],
    address_postcode: ukPostcode.fromString(formFields[HOME_ADDRESS_POSTCODE_FIELD]).toString(),
    dob_day: parseInt(formFields[DOB_DAY_FIELD], 10),
    dob_month: parseInt(formFields[DOB_MONTH_FIELD], 10),
    dob_year: parseInt(formFields[DOB_YEAR_FIELD], 10)
  }
  if (formFields[HOME_ADDRESS_LINE2_FIELD]) {
    stripePerson.address_line2 = formFields[HOME_ADDRESS_LINE2_FIELD]
  }
  return stripePerson
}

const validate = (formFields, fieldName, fieldValidator, maxLength) => {
  const field = formFields[fieldName]
  const isFieldValid = fieldValidator(field, maxLength)
  if (!isFieldValid.valid) {
    return isFieldValid.message
  }
  return null
}

const validateDoB = (formFields) => {
  const day = formFields[DOB_DAY_FIELD]
  const month = formFields[DOB_MONTH_FIELD]
  const year = formFields[DOB_YEAR_FIELD]
  const dateOfBirthValidationResult = validateDateOfBirth(day, month, year)
  if (!dateOfBirthValidationResult.valid) {
    return dateOfBirthValidationResult.message
  }
  return null
}

const formatDateOfBirth = (day, month, year) => {
  return moment({
    day: parseInt(day, 10),
    month: parseInt(month, 10) - 1,
    year: parseInt(year, 10)
  }).format('D MMMM YYYY')
}