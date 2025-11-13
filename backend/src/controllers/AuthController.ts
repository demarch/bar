import { Request, Response } from 'express';
import AuthService from '../services/AuthService';
import { asyncHandler } from '../middlewares/errorHandler';
import { LoginRequest } from '../types';

class AuthController {
  login = asyncHandler(async (req: Request, res: Response) => {
    const data: LoginRequest = req.body;
    const result = await AuthService.login(data);
    res.json(result);
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await AuthService.refreshToken(refreshToken);
    res.json(result);
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    res.json({ user: req.user });
  });
}

export default new AuthController();
