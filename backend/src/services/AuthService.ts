import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario';
import { LoginRequest, LoginResponse, TokenPayload, TipoUsuario } from '../types';
import { AppError } from '../middlewares/errorHandler';

class AuthService {
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private jwtExpiresIn: string;
  private jwtRefreshExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'secret';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const { login, senha } = data;

    // Buscar usuário
    const usuario = await Usuario.findOne({ where: { login } });
    if (!usuario) {
      throw new AppError('Credenciais inválidas', 401);
    }

    // Verificar se usuário está ativo
    if (!usuario.ativo) {
      throw new AppError('Usuário inativo', 403);
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw new AppError('Credenciais inválidas', 401);
    }

    // Gerar tokens
    const token = this.generateToken(usuario);
    const refreshToken = this.generateRefreshToken(usuario);

    return {
      token,
      refreshToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        login: usuario.login,
        tipo: usuario.tipo
      }
    };
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as TokenPayload;

      // Buscar usuário
      const usuario = await Usuario.findByPk(decoded.id);
      if (!usuario || !usuario.ativo) {
        throw new AppError('Usuário não encontrado ou inativo', 401);
      }

      // Gerar novos tokens
      const newToken = this.generateToken(usuario);
      const newRefreshToken = this.generateRefreshToken(usuario);

      return { token: newToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new AppError('Refresh token inválido', 401);
    }
  }

  private generateToken(usuario: Usuario): string {
    const payload: TokenPayload = {
      id: usuario.id,
      login: usuario.login,
      tipo: usuario.tipo
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  private generateRefreshToken(usuario: Usuario): string {
    const payload: TokenPayload = {
      id: usuario.id,
      login: usuario.login,
      tipo: usuario.tipo
    };

    return jwt.sign(payload, this.jwtRefreshSecret, { expiresIn: this.jwtRefreshExpiresIn });
  }

  async hashPassword(senha: string): Promise<string> {
    return bcrypt.hash(senha, 10);
  }

  async criarUsuario(
    nome: string,
    login: string,
    senha: string,
    tipo: TipoUsuario
  ): Promise<Usuario> {
    const senhaHash = await this.hashPassword(senha);

    const usuario = await Usuario.create({
      nome,
      login,
      senha: senhaHash,
      tipo,
      ativo: true
    });

    return usuario;
  }
}

export default new AuthService();
