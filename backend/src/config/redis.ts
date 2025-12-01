import Redis from 'ioredis';

class RedisClient {
  private static instance: Redis | null = null;
  private static isConnected: boolean = false;
  private static isEnabled: boolean = true;

  public static getInstance(): Redis | null {
    if (!this.isEnabled) {
      return null;
    }

    if (!this.instance) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.instance = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableReadyCheck: true,
        connectTimeout: 5000,
        retryStrategy: (times) => {
          if (times > 3) {
            console.log('⚠️ Redis unavailable - running without cache');
            this.isEnabled = false;
            return null; // Stop retrying
          }
          return Math.min(times * 200, 1000);
        },
      });

      this.instance.on('connect', () => {
        console.log('✅ Redis Connected');
        this.isConnected = true;
      });

      this.instance.on('error', (err: Error) => {
        // Only log once, not on every retry
        if (this.isConnected) {
          console.error('❌ Redis Error:', err.message);
        }
        this.isConnected = false;
      });

      this.instance.on('close', () => {
        if (this.isConnected) {
          console.log('⚠️ Redis Connection Closed');
        }
        this.isConnected = false;
      });
    }

    return this.instance;
  }

  public static async connect(): Promise<void> {
    try {
      const client = this.getInstance();
      if (client) {
        await client.connect();
      }
    } catch (error) {
      console.log('⚠️ Redis unavailable - running without cache');
      this.isEnabled = false;
      // Don't throw - app should work without Redis (with reduced functionality)
    }
  }

  public static getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public static isRedisEnabled(): boolean {
    return this.isEnabled && this.isConnected;
  }

  public static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
      this.isConnected = false;
    }
  }
}

export const redis = RedisClient.getInstance();
export default RedisClient;
