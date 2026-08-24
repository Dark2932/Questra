'use strict';

/** Express 5 已支持 Promise，这个包装器仍用于统一输出可读的 JSON 错误。 */
function asyncRoute(handler) {
  return async function wrappedRoute(req, res, next) {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { asyncRoute, HttpError };
