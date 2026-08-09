const MIN_PASSWORD_LENGTH = 8

export { MIN_PASSWORD_LENGTH }

/** Client-side validation for the public setup-password form. */
export function validateSetupPasswordFields(
  password: string,
  confirmPassword: string,
): { password?: string; confirm?: string } {
  const errors: { password?: string; confirm?: string } = {}
  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (!confirmPassword) {
    errors.confirm = 'Confirm your password.'
  } else if (password && confirmPassword !== password) {
    errors.confirm = 'Passwords do not match.'
  }
  return errors
}
