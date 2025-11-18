import redis from '../config/redis';

/**
 * Adiciona um token à blacklist
 * @param token - JWT token a ser revogado
 * @param expiresIn - Tempo em segundos até o token expirar naturalmente
 */
export const addToBlacklist = async (token: string, expiresIn: number): Promise<void> => {
  try {
    // Armazenar no Redis com TTL igual ao tempo de expiração do token
    // Após expirar, o Redis remove automaticamente
    await redis.setEx(`blacklist:${token}`, expiresIn, '1');
  } catch (error) {
    console.error('Erro ao adicionar token à blacklist:', error);
    throw new Error('Erro ao revogar token');
  }
};

/**
 * Verifica se um token está na blacklist
 * @param token - JWT token a verificar
 * @returns true se o token está revogado, false caso contrário
 */
export const isBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const result = await redis.get(`blacklist:${token}`);
    return result !== null;
  } catch (error) {
    console.error('Erro ao verificar blacklist:', error);
    // Em caso de erro, não bloquear o acesso (fail-open)
    // Mas em produção, você pode querer fail-closed
    return false;
  }
};

/**
 * Remove um token da blacklist (útil para testes)
 * @param token - JWT token a remover
 */
export const removeFromBlacklist = async (token: string): Promise<void> => {
  try {
    await redis.del(`blacklist:${token}`);
  } catch (error) {
    console.error('Erro ao remover token da blacklist:', error);
    throw new Error('Erro ao remover token da blacklist');
  }
};

/**
 * Limpa toda a blacklist (útil para testes e manutenção)
 */
export const clearBlacklist = async (): Promise<void> => {
  try {
    const keys = await redis.keys('blacklist:*');
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    console.error('Erro ao limpar blacklist:', error);
    throw new Error('Erro ao limpar blacklist');
  }
};
