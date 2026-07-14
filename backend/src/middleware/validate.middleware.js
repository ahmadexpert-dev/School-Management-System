// Validates req.body against a Zod schema, replacing req.body with the
// parsed (and type-coerced/defaulted) result on success. Keeps controllers
// free of manual `if (!field)` checks and gives consistent 400 error shapes.
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
      return res.status(400).json({ error: message });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validateBody };
