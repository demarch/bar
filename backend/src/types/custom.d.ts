import { Request, Response, NextFunction } from 'express';

declare module 'express-mongo-sanitize' {
  interface MongoSanitizeOptions {
    replaceWith?: string;
    onSanitize?: (payload: { req: Request; key: string }) => void;
    dryRun?: boolean;
  }

  function mongoSanitize(options?: MongoSanitizeOptions): (req: Request, res: Response, next: NextFunction) => void;
  export default mongoSanitize;
}

declare module 'morgan';
