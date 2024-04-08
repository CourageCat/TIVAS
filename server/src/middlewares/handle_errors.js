import createErrors from "http-errors";

export const notFound = (req, res) => {
  const err = createErrors.NotFound("This route is not defined!");
  return res.status(err.status).json({
    err: 1,
    mess: err.message,
  });
};

export const missValue = (error, res) => {
  const err = createErrors.Forbidden(error);
  return res.status(err.status).json({
    err: 1,
    mess: err.message,
  });
};

export const notAuth = (error, res) => {
  const err = createErrors.Unauthorized(error);
  return res.status(err.status).json({
    err: 1,
    mess: err.message,
  });
};

export const badRequest = (error, res) => {
  const err = createErrors.BadRequest(error);
  return res.status(err.status).json({
    err: 1,
    mess: err.message,
  });
};

export const internalServerError = (error, res) => {
  const err = createErrors.InternalServerError(error);
  return res.status(err.status).json({
    err: 1,
    mess: err.message,
  });
};