const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validation rules
const authValidation = {
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('Password must contain a number'),
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('last_name').trim().notEmpty().withMessage('Last name is required'),
    body('phone').optional().trim(),
    body('date_of_birth').optional().isISO8601().withMessage('Invalid date format'),
    body('address').optional().trim(),
    handleValidationErrors
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ],
  forgotPassword: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    handleValidationErrors
  ],
  resetPassword: [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('Password must contain a number'),
    handleValidationErrors
  ],
  verify2fa: [
    body('temp_token').notEmpty().withMessage('Temporary token is required'),
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('6-digit code required'),
    handleValidationErrors
  ]
};

// Account validation rules
const accountValidation = {
  create: [
    body('account_type')
      .isIn(['checking', 'savings', 'credit'])
      .withMessage('Invalid account type'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    handleValidationErrors
  ],
  getById: [
    param('id').isInt({ min: 1 }).withMessage('Valid account ID is required'),
    handleValidationErrors
  ]
};

// Transaction validation rules
const transactionValidation = {
  transfer: [
    body('from_account_id').isInt({ min: 1 }).withMessage('Source account is required'),
    body('to_account_id').isInt({ min: 1 }).withMessage('Destination account is required'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('description').optional().trim(),
    handleValidationErrors
  ],
  deposit: [
    body('account_id').isInt({ min: 1 }).withMessage('Account ID is required'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('description').optional().trim(),
    handleValidationErrors
  ],
  withdraw: [
    body('account_id').isInt({ min: 1 }).withMessage('Account ID is required'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('description').optional().trim(),
    handleValidationErrors
  ],
  getHistory: [
    query('account_id').optional().isInt({ min: 1 }).withMessage('Invalid account ID'),
    query('type').optional().isIn(['transfer', 'deposit', 'withdrawal', 'payment']).withMessage('Invalid transaction type'),
    query('status').optional().isIn(['pending', 'completed', 'failed', 'reversed']).withMessage('Invalid status'),
    query('start_date').optional().isISO8601().withMessage('Invalid start date'),
    query('end_date').optional().isISO8601().withMessage('Invalid end date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Invalid page number'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
    handleValidationErrors
  ]
};

// Bill validation rules
const billValidation = {
  addPayee: [
    body('payee_name').trim().notEmpty().withMessage('Payee name is required'),
    body('account_number').trim().notEmpty().withMessage('Account number is required'),
    body('bank_name').trim().notEmpty().withMessage('Bank name is required'),
    body('routing_number').optional().trim(),
    handleValidationErrors
  ],
  payment: [
    body('payee_id').isInt({ min: 1 }).withMessage('Payee ID is required'),
    body('from_account_id').isInt({ min: 1 }).withMessage('Account ID is required'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('payment_date').isISO8601().withMessage('Valid payment date is required'),
    body('description').optional().trim(),
    handleValidationErrors
  ]
};

// Profile validation rules
const profileValidation = {
  update: [
    body('first_name').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('last_name').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('phone').optional().trim(),
    body('date_of_birth').optional().isISO8601().withMessage('Invalid date format'),
    body('address').optional().trim(),
    handleValidationErrors
  ],
  changePassword: [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('New password must contain a number'),
    handleValidationErrors
  ]
};

// Investment Account validation rules
const validateAccountCreation = [
  body('account_type_id').isInt({ min: 1 }).withMessage('Account type is required'),
  body('account_name').optional().trim().isLength({ max: 100 }).withMessage('Account name too long'),
  body('margin_enabled').optional().isBoolean().withMessage('Margin enabled must be boolean'),
  body('drip_enabled').optional().isBoolean().withMessage('DRIP enabled must be boolean'),
  body('initial_deposit').optional().isFloat({ min: 0 }).withMessage('Initial deposit must be non-negative'),
  handleValidationErrors
];

const validateExternalAccount = [
  body('institution_name').trim().notEmpty().withMessage('Institution name is required'),
  body('account_name').trim().notEmpty().withMessage('Account name is required'),
  body('account_type').isIn(['checking', 'savings', 'investment']).withMessage('Invalid account type'),
  body('account_number').trim().isLength({ min: 4, max: 20 }).withMessage('Valid account number is required'),
  body('routing_number').trim().isLength({ min: 9, max: 9 }).withMessage('Valid 9-digit routing number is required'),
  body('nickname').optional().trim().isLength({ max: 50 }).withMessage('Nickname too long'),
  handleValidationErrors
];

module.exports = {
  authValidation,
  accountValidation,
  transactionValidation,
  billValidation,
  profileValidation,
  validateAccountCreation,
  validateExternalAccount,
  handleValidationErrors
};
