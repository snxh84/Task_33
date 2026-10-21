/**
 * methodNotAllowed — answers 405 for "right path, wrong verb" (§2.2)
 * and tells the client which methods that resource does accept.
 */
module.exports = (req, res, allowedMethods) => {
  const allow = ['OPTIONS', ...allowedMethods].join(', ');
  res.set('Allow', allow).status(405).json({
    success: false,
    message: `Method ${req.method} is not allowed on this resource. Allowed: ${allowedMethods.join(', ')}`,
  });
};
