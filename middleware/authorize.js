const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Your are unauthorised to perform this action." });
    }
    next();
  };
};

module.exports = authorize;
