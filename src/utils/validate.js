'use strict';

const { WORKSPACE_NAME_REGEX } = require('../constants');

function validateWorkspaceName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    return { valid: false, message: 'El nombre del workspace no puede estar vacío.' };
  }
  if (!WORKSPACE_NAME_REGEX.test(name)) {
    return { valid: false, message: 'El nombre solo puede contener letras, números, guiones y guiones bajos.' };
  }
  return { valid: true };
}

function validateEmail(email) {
  if (typeof email !== 'string' || !email.trim()) {
    return { valid: false, message: 'El email no puede estar vacío.' };
  }
  if (!email.includes('@')) {
    return { valid: false, message: 'El email debe contener @.' };
  }
  return { valid: true };
}

module.exports = {
  validateWorkspaceName,
  validateEmail
};
