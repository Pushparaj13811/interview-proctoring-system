import type { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import ApiResponse from "../Utils/apiResponse";

const validate = (schema: z.ZodSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));

        const message = `Validation failed: ${errorDetails.map(e => e.message).join(', ')}`;
        return res.status(400).json(
          ApiResponse.error(message)
        );
      }
      next(error);
    }
  };
};

export default validate;