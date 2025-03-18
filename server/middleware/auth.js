export const requireAuth = (req, res, next) => {
  if (!req.session.user_id) {
    return res.status(401).json({
      message: "Unauthorized",
      redirectUrl: "/login",
    });
  }
  next();
};
