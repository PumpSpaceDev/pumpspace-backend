# PumpSpace Backend 技术实现指导

## 1. Monorepo 构建

### 1.1 初始化项目

### 1.2 文件结构优化
- 将 `libs/shared` 用于共享模块，例如数据库连接、Redis 客户端、日志工具。
- 在 `libs/interfaces` 中定义所有的 DTO 和接口。
- 在 `libs/config` 中集中管理配置，支持 `.env` 文件的动态加载。

---

## 2. 数据收集服务（Data Collector Service）

### 2.1 服务职责
- 从 Shyft 提供的 gRPC 数据流中获取 Solana 全量交易。
- 过滤 Raydium 相关交易，存储至数据库。
- 将 Raydium 交易推送到 Redis Pub/Sub。

### 2.2 技术实现

#### 数据库连接
使用 `@nestjs/typeorm` 模块，配置数据库连接：

```typescript
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
    }),
  ],
})
```

#### gRPC 数据接收
使用 `@nestjs/microservices` 配置 gRPC 客户端：

```typescript
@Client({
  transport: Transport.GRPC,
  options: {
    package: 'shyft',
    protoPath: join(__dirname, '../proto/shyft.proto'),
  },
})
private client: ClientGrpc;

async fetchTransactions() {
  const service = this.client.getService<TransactionService>('TransactionService');
  const stream = service.getTransactions({});
  stream.on('data', (transaction) => this.processTransaction(transaction));
}
```

#### Redis 发布

```typescript
@Inject('REDIS_CLIENT') private redisClient: Redis;
async publishTransaction(transaction: any) {
  await this.redisClient.publish('raydium-transactions', JSON.stringify(transaction));
}
```

### 2.3 部署与调试
- 确保 gRPC 服务的 proto 文件和 API 对接正确。
- 使用 Docker 或本地运行 PostgreSQL 和 Redis。

---

## 3. 分析与统计服务（Analysis & Token Statistics Service）

### 3.1 服务职责
- 从 Redis Pub/Sub 中订阅 Raydium 交易。
- 执行聪明钱匹配。
- 使用滑动窗口 + 分桶计算 Token 统计。

### 3.2 技术实现

#### Redis 订阅

```typescript
@Inject('REDIS_CLIENT') private redisClient: Redis;

async onModuleInit() {
  this.redisClient.subscribe('raydium-transactions', (err, count) => {
    if (err) {
      console.error('Failed to subscribe: ', err.message);
    }
  });

  this.redisClient.on('message', (channel, message) => {
    if (channel === 'raydium-transactions') {
      const transaction = JSON.parse(message);
      this.handleTransaction(transaction);
    }
  });
}
```

#### Token 统计逻辑
使用 Redis 哈希表存储分桶数据：

```typescript
async updateTokenStats(tokenId: string, volume: number, timestamp: number) {
  const bucketKey = `token:${tokenId}:buckets`;
  const totalKey = `token:${tokenId}:total`;

  await this.redisClient.hincrby(bucketKey, timestamp.toString(), volume);
  await this.redisClient.incrby(totalKey, volume);
}
```

- 定期清理过期分桶数据。

---

## 4. 通知服务（Notification Service）

### 4.1 服务职责
- 从 Redis Pub/Sub 接收聪明钱匹配结果。
- 根据规则过滤并发送通知。

### 4.2 技术实现
- 使用 `@nestjs/microservices` 处理 Redis 消息。
- 集成 Telegram Bot SDK，实现通知推送：

```typescript
@Injectable()
export class NotificationService {
  async sendNotification(tokenInfo: any) {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    await bot.sendMessage(process.env.NOTIFICATION_CHAT_ID, `Smart Money Alert: ${tokenInfo}`);
  }
}
```

---

## 5. 智能配置与文档支持

### 5.1 API 文档
使用 Swagger 自动生成 API 文档：

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('PumpSpace API')
  .setDescription('API Documentation for PumpSpace Backend')
  .setVersion('1.0')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
```

### 5.2 环境变量管理
使用 `@nestjs/config` 模块统一加载配置：

```typescript
ConfigModule.forRoot({
  envFilePath: `.env.${process.env.NODE_ENV}`,
  isGlobal: true,
});
```

---

## 6. 任务分解与优先级

### 6.1 项目初始化与结构搭建
- 完成 Monorepo 项目结构搭建。
- 配置共享模块（数据库、Redis、配置管理）。

### 6.2 数据收集服务
- 实现 gRPC 数据获取、过滤、存储、推送。

### 6.3 分析与统计服务
- 实现聪明钱匹配和 Token 统计。

### 6.4 通知服务
- 集成 Telegram 推送逻辑。
