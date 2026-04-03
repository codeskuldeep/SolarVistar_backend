export const pagination = ({
  defaultPage = 1,
  defaultLimit = 10,
  maxLimit = 100,
} = {}) => {
  return (req, res, next) => {
    let { page, limit } = req.query;

    // Convert to numbers
    page = Number(page);
    limit = Number(limit);

    // Validate page
    if (!Number.isInteger(page) || page < 1) {
      page = defaultPage;
    }

    // Validate limit
    if (!Number.isInteger(limit) || limit < 1) {
      limit = defaultLimit;
    }

    // Prevent abuse (e.g., limit=1000000)
    if (limit > maxLimit) {
      limit = maxLimit;
    }

    // Calculate skip (for DB queries)
    const skip = (page - 1) * limit;

    // Attach to request
    req.pagination = {
      page,
      limit,
      skip,
    };

    next();
  };
};