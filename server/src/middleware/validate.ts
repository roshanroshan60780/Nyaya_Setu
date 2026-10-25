import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Generic Zod validation middleware factory.
 * Takes a Zod schema and returns middleware that validates req.body against it.
 * On validation failure, returns 400 with detailed field-level error messages.
 *
 * @param schema - Zod schema to validate the request body against
 * @returns Express middleware that validates and transforms req.body
 *
 * @example
 * const createSchema = z.object({ title: z.string().min(1) });
 * router.post('/', validate(createSchema), handler);
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
        });
        return;
      }

      res.status(400).json({ error: 'Invalid request data' });
    }
  };
}
