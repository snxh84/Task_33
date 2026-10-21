/**
 * notFound — catches every request that no route claimed and answers
 * with the standard error envelope instead of Express's default HTML.
 */
module.exports = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};
